const express = require('express');
const router = express.Router();
const db = require('../db');

// Lấy danh sách danh mục để hiển thị bộ lọc
router.get('/categories', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT DISTINCT category FROM products ORDER BY category ASC');
    const categories = rows.map(r => r.category);
    res.json({ success: true, data: categories });
  } catch (err) {
    console.error('[Error] Categories fetch failed:', err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// Hàm chuẩn hóa & Escape theo chuẩn phòng thủ (không dùng blacklist/regex lọc từ khóa):
// - Dev escape mọi ký tự nháy đơn (') thành (\') để ngăn chặn thoát chuỗi.
function escapeSearchKeyword(raw) {
  if (!raw) return '';
  return raw.replace(/'/g, "\\'");
}

// GET /api/products
// API nghiệp vụ chuẩn Production: Chỉ trả về danh sách sản phẩm, triệt tiêu toàn bộ metadata/debug hints.
// Cơ chế ẩn:
// - Lần 1 và 2: Chạy Prepared Statement an toàn để tối ưu tài nguyên.
// - Lần 3 trở lên: Âm thầm kích hoạt Stored Procedure `sp_deep_search_products` (dính dynamic SQLi).
// - Khi có lỗi SQL do payload: Chỉ trả về generic "Internal Server Error" (Ép buộc dùng kỹ thuật Blind SQLi).
router.get('/', async (req, res) => {
  const { search, category } = req.query;
  const rawKeyword = (search || '').trim();

  try {
    // Không có từ khóa tìm kiếm: Truy vấn danh sách mặc định
    if (!rawKeyword) {
      let query = 'SELECT id, name, category, price, stock, description, created_at FROM products WHERE 1=1';
      const params = [];
      if (category && category !== 'All') {
        query += ' AND category = ?';
        params.push(category);
      }
      query += ' ORDER BY id DESC';
      const [products] = await db.query(query, params);
      return res.json({ success: true, data: products });
    }

    // Áp dụng cơ chế escape của dev (thay thế ' thành \')
    const escapedKeyword = escapeSearchKeyword(rawKeyword);

    // Kiểm tra trạng thái cache câu truy vấn (theo dõi theo chuỗi gốc rawKeyword)
    const [[state]] = await db.query(
      'SELECT id, active_keyword, hit_count FROM search_cache_state WHERE id = 1'
    );

    if (state && state.active_keyword === rawKeyword) {
      const nextHits = (state.hit_count || 0) + 1;

      if (nextHits < 3) {
        // Lần 2: Tiếp tục chế độ chuẩn (Prepared Statement an toàn)
        await db.query(
          'UPDATE search_cache_state SET hit_count = ? WHERE id = 1',
          [nextHits]
        );

        let safeQuery = 'SELECT id, name, category, price, stock, description, created_at FROM products WHERE (name LIKE ? OR description LIKE ?)';
        const safeParams = [`%${rawKeyword}%`, `%${rawKeyword}%`];
        if (category && category !== 'All') {
          safeQuery += ' AND category = ?';
          safeParams.push(category);
        }
        safeQuery += ' ORDER BY id DESC';

        const [products] = await db.query(safeQuery, safeParams);
        return res.json({ success: true, data: products });
      } else {
        // Lần 3 trở lên: Âm thầm kích hoạt Stored Procedure với 2 tham số: escapedKeyword và category
        await db.query(
          'UPDATE search_cache_state SET hit_count = ? WHERE id = 1',
          [nextHits]
        );

        // Tham số escapedKeyword được truyền an toàn vào p_keyword TEXT (cắt cụt ở v_search VARCHAR(64))
        // Tham số category được truyền vào p_category VARCHAR(255)
        const targetCategory = category || 'All';
        const [resultSets] = await db.query('CALL sp_deep_search_products(?, ?)', [escapedKeyword, targetCategory]);
        const products = Array.isArray(resultSets) && resultSets.length > 0 ? resultSets[0] : [];
        return res.json({ success: true, data: products });
      }
    } else {
      // Lần 1: Truy vấn mới -> Reset hit_count = 1, chạy Prepared Statement an toàn
      await db.query(
        'UPDATE search_cache_state SET active_keyword = ?, hit_count = 1 WHERE id = 1',
        [rawKeyword]
      );

      let safeQuery = 'SELECT id, name, category, price, stock, description, created_at FROM products WHERE (name LIKE ? OR description LIKE ?)';
      const safeParams = [`%${rawKeyword}%`, `%${rawKeyword}%`];
      if (category && category !== 'All') {
        safeQuery += ' AND category = ?';
        safeParams.push(category);
      }
      safeQuery += ' ORDER BY id DESC';

      const [products] = await db.query(safeQuery, safeParams);
      return res.json({ success: true, data: products });
    }
  } catch (err) {
    console.error('[Database Error]', err.message);
    // Trả về lỗi dạng "leak/hint" thực tế (thường thấy khi dev để lộ exception handler hoặc middleware logging)
    // Giúp người test nhận diện được sự xuất hiện của Stored Procedure, mã lỗi và ranh giới cắt cụt
    return res.status(500).json({
      success: false,
      error: 'QueryExecutionException: An error occurred while executing procedure [sp_deep_search_products]',
      details: {
        code: err.code || 'ER_QUERY_INTERRUPTED',
        sqlState: err.sqlState || '42000',
        message: err.sqlMessage || err.message,
        hint: 'Buffer boundary exceeded near limit [VARCHAR(64)] in multi-parameter query (name, category)'
      }
    });
  }
});

// POST /api/products - Tạo sản phẩm mới
router.post('/', async (req, res) => {
  const { name, category, price, stock, description } = req.body;

  if (!name || !category) {
    return res.status(400).json({ success: false, error: 'Name and Category are required' });
  }

  try {
    const numPrice = parseFloat(price) || 0.00;
    const numStock = parseInt(stock, 10) || 0;
    const desc = description || '';

    const [result] = await db.query(
      'INSERT INTO products (name, category, price, stock, description) VALUES (?, ?, ?, ?, ?)',
      [name, category, numPrice, numStock, desc]
    );

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: { id: result.insertId, name, category, price: numPrice, stock: numStock, description: desc }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/products/:id - Cập nhật sản phẩm
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, category, price, stock, description } = req.body;

  if (!name || !category) {
    return res.status(400).json({ success: false, error: 'Name and Category are required' });
  }

  try {
    const numPrice = parseFloat(price) || 0.00;
    const numStock = parseInt(stock, 10) || 0;
    const desc = description || '';

    const [result] = await db.query(
      'UPDATE products SET name = ?, category = ?, price = ?, stock = ?, description = ? WHERE id = ?',
      [name, category, numPrice, numStock, desc, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: { id: parseInt(id, 10), name, category, price: numPrice, stock: numStock, description: desc }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/products/:id - Xóa sản phẩm
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.query('DELETE FROM products WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
