# تدفق بيانات إدارة الفواتير

## 1. نظرة عامة
يوضح هذا المستند تدفق إنشاء الفواتير واسترداد وإدارتها مع التركيز على طبقة الأمان متعددة المستأجرين.

## 2. استرداد الفواتير (قراءة)
**نقطة النهاية**: `GET /invoices`

```mermaid
sequenceDiagram
    participant User as المستخدم
    participant Filter as UnifiedAuthFilter
    participant RBAC as RbacFilter
    participant Ctrl as InvoiceController
    participant Model as InvoiceModel (TenantScope)
    participant DB as قاعدة البيانات

    User->>Filter: GET /invoices (Authorization: Bearer JWT)
    Filter->>Filter: حل المستأجر من JWT
    Filter->>RBAC: التحقق من الصلاحيات
    RBAC->>Ctrl: تمرير التحكم
    Ctrl->>Model: InvoiceModel.findAll()
    Note over Model: TenantScope يتدخل
    Model->>Model: حقن WHERE tenant_id = X
    Model->>DB: SELECT * FROM invoices WHERE tenant_id = X
    DB-->>User: إرجاع قائمة JSON
```

## 3. إنشاء الفواتير (كتابة)
**نقطة النهاية**: `POST /invoices`

1.  **التحقق**: تُرسل الواجهة الأمامية حمولة JSON.
2.  **الإدراج**: `TenantScope::beforeInsert` يضيف `tenant_id = X` تلقائيًا.
3.  **النتيجة**: الفاتورة مخزنة بـ `tenant_id` الصحيح وغير مرئية للمستأجرين الآخرين.

## 4. ضمانات الأمان
*   **مغلق عند الفشل**: JWT مفقود أو غير صالح → `WHERE 1=0` → نتائج فارغة.
*   **حجب عبر المستأجرين**: `RbacFilter` يمنع المستخدم من مستأجر A من الوصول لبيانات مستأجر B.
