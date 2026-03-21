-- Row Level Security örneği (tenant izolasyonu)
-- Uygulama bağlantısı sonrası: SET LOCAL app.current_tenant = '<TENANT_UUID>';

ALTER TABLE "Course" ENABLE ROW LEVEL SECURITY;
CREATE POLICY course_tenant_isolation ON "Course"
  USING ("tenantId" = current_setting('app.current_tenant')::text);

ALTER TABLE "Enrollment" ENABLE ROW LEVEL SECURITY;
CREATE POLICY enrollment_tenant_isolation ON "Enrollment"
  USING ("tenantId" = current_setting('app.current_tenant')::text);

-- Not: current_setting text döndürür; tenantId tipi UUID ise ::uuid cast kullanın.
-- Session başına tenant ayarı (örnek): SELECT set_config('app.current_tenant', 'tenant-uuid', true);
-- Bu dosya referans amaçlıdır; Prisma şemasında tenantId alanı olan tüm tablolara uygulanmalıdır.
