
CREATE INDEX IF NOT EXISTS idx_orders_user_date ON public.orders (user_id, order_date DESC);
CREATE INDEX IF NOT EXISTS idx_orders_user_status_phone ON public.orders (user_id, order_status, customer_phone) WHERE customer_phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_user_phone ON public.orders (user_id, customer_phone) WHERE customer_phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_user_orderid ON public.orders (user_id, order_id);
