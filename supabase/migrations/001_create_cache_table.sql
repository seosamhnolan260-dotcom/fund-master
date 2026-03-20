-- 创建缓存表
-- 用于存储基金信息、净值数据和 AI 报告的缓存

CREATE TABLE IF NOT EXISTS cache (
  id BIGSERIAL PRIMARY KEY,
  cache_key TEXT NOT NULL UNIQUE,
  data JSONB NOT NULL,
  expires_at BIGINT NOT NULL,
  created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
  updated_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
);

-- 创建索引以加速查询
CREATE INDEX IF NOT EXISTS idx_cache_key ON cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_cache_expires_at ON cache(expires_at);

-- 创建自动清理过期缓存的函数
CREATE OR REPLACE FUNCTION clean_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM cache
  WHERE expires_at < EXTRACT(EPOCH FROM NOW()) * 1000;
END;
$$ LANGUAGE plpgsql;

-- 创建定时任务 (需要 pg_cron 扩展)
-- 每小时清理一次过期缓存
-- SELECT cron.schedule('clean-cache', '0 * * * *', 'SELECT clean_expired_cache();');

-- 添加注释
COMMENT ON TABLE cache IS '数据缓存表 - 存储基金信息、净值、AI 报告等缓存数据';
COMMENT ON COLUMN cache.cache_key IS '缓存键，格式：type:id:field';
COMMENT ON COLUMN cache.data IS '缓存数据 (JSON 格式)';
COMMENT ON COLUMN cache.expires_at IS '过期时间戳 (毫秒)';
