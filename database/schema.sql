-- Create database
CREATE DATABASE IF NOT EXISTS billing_tool;
USE billing_tool;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Company Profiles table
CREATE TABLE IF NOT EXISTS company_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    vat_id VARCHAR(50),
    legal_organization_id VARCHAR(50),
    street VARCHAR(255),
    city VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(2),
    email VARCHAR(255),
    phone VARCHAR(50),
    website VARCHAR(255),
    logo_url VARCHAR(255),
    bank_iban VARCHAR(50),
    bank_bic VARCHAR(20),
    bank_account_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    issue_date DATE NOT NULL,
    due_date DATE,
    invoice_type_code VARCHAR(10) DEFAULT '380',
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    status ENUM('draft', 'validated', 'sent', 'paid', 'cancelled') DEFAULT 'draft',
    
    -- Seller snapshot (could be linked to company_profile, but snapshot is safer for history)
    seller_name VARCHAR(255) NOT NULL,
    seller_vat_id VARCHAR(50),
    seller_address_json JSON,
    seller_contact_json JSON,
    
    -- Buyer details
    buyer_name VARCHAR(255) NOT NULL,
    buyer_vat_id VARCHAR(50),
    buyer_address_json JSON,
    buyer_contact_json JSON,
    
    -- Totals
    line_extension_amount DECIMAL(15, 2) DEFAULT 0.00,
    tax_exclusive_amount DECIMAL(15, 2) DEFAULT 0.00,
    tax_inclusive_amount DECIMAL(15, 2) DEFAULT 0.00,
    payable_amount DECIMAL(15, 2) DEFAULT 0.00,
    
    -- Payment info
    payment_terms_json JSON,
    payment_means_json JSON,
    
    note TEXT,
    signed BOOLEAN DEFAULT FALSE,
    signature_date DATETIME,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Invoice Lines table
CREATE TABLE IF NOT EXISTS invoice_lines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id INT NOT NULL,
    description TEXT NOT NULL,
    quantity DECIMAL(15, 4) NOT NULL,
    unit_code VARCHAR(10) NOT NULL DEFAULT 'EA',
    unit_price DECIMAL(15, 4) NOT NULL,
    tax_category VARCHAR(10),
    tax_percent DECIMAL(5, 2) DEFAULT 0.00,
    line_extension_amount DECIMAL(15, 2),
    
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

-- Invoice Templates table
CREATE TABLE IF NOT EXISTS invoice_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    seller_json JSON,
    default_currency VARCHAR(3) DEFAULT 'EUR',
    default_tax_category VARCHAR(10),
    default_tax_percent DECIMAL(5, 2),
    default_payment_terms_json JSON,
    header_text TEXT,
    footer_text TEXT,
    logo_url VARCHAR(255),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Audit Logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id INT,
    user_id INT,
    action VARCHAR(50) NOT NULL,
    details TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
