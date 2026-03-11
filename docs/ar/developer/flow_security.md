# تدفق بيانات الأمان والعزل

## 1. نظرة عامة
يوضح هذا المستند معمارية الأمان المستخدمة لفرض التعدد في المستأجرين وRBAC.

## 2. خط أنابيب الفلتر
كل طلب يمر عبر سلسلة من الفلاتر:

1.  **CorsFilter (`cors`)**: يسمح بالطلبات من الأصول المعتمدة.
2.  **UnifiedAuthFilter (`auth`)**:
    *   **الخطوة الحاسمة**: يتعامل مع تعريف المستأجر ومصادقة المستخدم.
    *   المصدر: رمز JWT > مسار URL > النطاق الفرعي.
    *   الإجراء: تحميل المستأجر وضبط `currentTenant`.
3.  **RbacFilter (`rbac`)**:
    *   يتحقق من الصلاحية المحددة (مثلاً `invoices.read`).
    *   يتجاوز للمستخدمين بالدور `admin`.

## 3. تحديد نطاق قاعدة البيانات (TenantScope)
السمة `TenantScope` هي خط الدفاع الأخير.

```php
protected function beforeFind(array $data) {
    $tenant = config('App')->currentTenant;

    if ($tenant) {
        // عملية عادية
        $this->where('tenant_id', $tenant->id);
    } else {
        // أمان مغلق عند الفشل
        $this->where('1=0');
    }
    return $data;
}
```

### آلية التجاوز
للعمليات العامة (مثل تسجيل الدخول)، يجب على المطورين تجاوز النطاق صراحةً:
```php
$userModel->withoutTenant()->find($id);
```
