CREATE DATABASE IF NOT EXISTS factory_db2
  CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE factory_db2;

CREATE TABLE IF NOT EXISTS plants (
    id VARCHAR(10) NOT NULL,
    name VARCHAR(255) NOT NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(50) NOT NULL,
    card_number VARCHAR(5) NOT NULL,
    user_name VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,
    plant_id VARCHAR(10) NOT NULL,
    plant_name VARCHAR(100) NOT NULL,
    security_question VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    PRIMARY KEY (user_id),
    UNIQUE KEY uq_users_card_number (card_number),
    KEY idx_users_plant_id (plant_id),
    CONSTRAINT fk_users_plant
      FOREIGN KEY (plant_id) REFERENCES plants(id)
      ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS admins (
    username VARCHAR(50) NOT NULL,
    password VARCHAR(255) NOT NULL,
    plant_id VARCHAR(10) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    PRIMARY KEY (username),
    KEY idx_admins_plant_id (plant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS checkpoints (
    id INT NOT NULL AUTO_INCREMENT,
    plant_id VARCHAR(10) DEFAULT NULL,
    plant_name VARCHAR(255) DEFAULT NULL,
    point_name VARCHAR(255) NOT NULL,
    qr_code_image LONGBLOB DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_checkpoints_plant_id (plant_id),
    CONSTRAINT fk_checkpoints_plant
      FOREIGN KEY (plant_id) REFERENCES plants(id)
      ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS user_report (
    report_id INT NOT NULL AUTO_INCREMENT,
    user_id VARCHAR(50) DEFAULT NULL,
    user_name VARCHAR(100) DEFAULT NULL,
    plant_name VARCHAR(100) DEFAULT NULL,
    Qr_code_scaning_detail TEXT DEFAULT NULL,
    Live_photo LONGTEXT DEFAULT NULL,
    Live_current_point_photo LONGTEXT DEFAULT NULL,
    Live_area_short_video LONGTEXT DEFAULT NULL,
    Remark_of_Point TEXT DEFAULT NULL,
    Qr_code_scaning_time_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (report_id),
    KEY idx_user_report_user_id (user_id),
    CONSTRAINT fk_user_report_user
      FOREIGN KEY (user_id) REFERENCES users(user_id)
      ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
