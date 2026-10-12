-- Klenz website schema for MySQL 5.7 / 8.x, generated from app/models.py.
-- The backend creates these tables by itself on first start; this file is for reference.

CREATE DATABASE IF NOT EXISTS `klenz` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `klenz`;

CREATE TABLE admin_users (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	email VARCHAR(191) NOT NULL, 
	name VARCHAR(120) NOT NULL, 
	password_hash VARCHAR(255) NOT NULL, 
	token_version INTEGER NOT NULL, 
	created_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (email)
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE orders (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	customer_name VARCHAR(120) NOT NULL, 
	phone VARCHAR(30) NOT NULL, 
	address TEXT NOT NULL, 
	note TEXT NOT NULL, 
	status VARCHAR(20) NOT NULL, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	PRIMARY KEY (id)
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX ix_orders_created_at ON orders (created_at);
CREATE INDEX ix_orders_status ON orders (status);

CREATE TABLE page_content (
	`key` VARCHAR(100) NOT NULL, 
	value TEXT NOT NULL, 
	PRIMARY KEY (`key`)
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE products (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	name VARCHAR(120) NOT NULL, 
	category VARCHAR(60) NOT NULL, 
	description VARCHAR(500) NOT NULL, 
	spec VARCHAR(120) NOT NULL, 
	art VARCHAR(20) NOT NULL, 
	tint VARCHAR(20) NOT NULL, 
	image_url VARCHAR(500) NOT NULL, 
	is_live BOOL NOT NULL, 
	sort_order INTEGER NOT NULL, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	PRIMARY KEY (id)
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX ix_products_sort_order ON products (sort_order);

CREATE TABLE site_settings (
	`key` VARCHAR(100) NOT NULL, 
	value TEXT NOT NULL, 
	PRIMARY KEY (`key`)
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE videos (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	title VARCHAR(120) NOT NULL, 
	url VARCHAR(500) NOT NULL, 
	sort_order INTEGER NOT NULL, 
	PRIMARY KEY (id)
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX ix_videos_sort_order ON videos (sort_order);

CREATE TABLE order_items (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	order_id INTEGER NOT NULL, 
	product_id INTEGER, 
	product_name VARCHAR(120) NOT NULL, 
	product_spec VARCHAR(120) NOT NULL, 
	quantity INTEGER NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(order_id) REFERENCES orders (id) ON DELETE CASCADE, 
	FOREIGN KEY(product_id) REFERENCES products (id) ON DELETE SET NULL
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX ix_order_items_order_id ON order_items (order_id);
CREATE INDEX ix_order_items_product_id ON order_items (product_id);

