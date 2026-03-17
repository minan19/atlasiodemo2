-- RLS pilot: Course ve Enrollment tablolarında tenant izolasyonu
-- Bu örnek, tenantId kolonunun zorunlu olduğunu varsayar. Eğer bazı tablolarda yoksa ekleyin.

ALTER TABLE "Course" ENABLE ROW LEVEL SECURITY;
CREATE POLICY course_tenant_isolation ON "Course"
  USING ("tenantId" = current_setting('app.current_tenant'));

ALTER TABLE "Enrollment" ENABLE ROW LEVEL SECURITY;
CREATE POLICY enrollment_tenant_isolation ON "Enrollment"
  USING ("tenantId" = current_setting('app.current_tenant'));

-- Yardımcı: app.current_tenant yoksa sorgu başarısız olmasın diye default boş değer atanabilir.
-- Fakat güvenlik için set_config yapılmadan erişim engellenir; opsiyonel:
-- ALTER DATABASE <db> SET app.current_tenant = 'deny';
