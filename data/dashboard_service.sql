-- -------------------------------------------------------------
-- TablePlus 4.0.0(370)
--
-- https://tableplus.com/
--
-- Database: dashboard_service
-- Generation Time: 2021-11-17 08:51:26.6870
-- -------------------------------------------------------------


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


CREATE TABLE `activity_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ip` varchar(20) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `data` json NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `activity_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `applicants` (
  `id` char(36) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
  `title` varchar(20) NOT NULL,
  `name` varchar(255) NOT NULL,
  `date_of_birth` varchar(50) NOT NULL,
  `gender` enum('male','female') NOT NULL,
  `marital_status` enum('married','single','complicated') NOT NULL,
  `home_address` text NOT NULL,
  `landmark` text NOT NULL,
  `phone_number` varchar(50) NOT NULL,
  `religion` varchar(100) NOT NULL,
  `place_of_worship` text NOT NULL,
  `mother_maiden_name` varchar(150) NOT NULL,
  `email_address` varchar(255) NOT NULL,
  `bvn` varchar(20) NOT NULL,
  `spouse_id` int(11) NOT NULL,
  `identification_id` int(11) NOT NULL,
  `education_id` int(11) NOT NULL,
  `occupation_id` int(11) NOT NULL,
  `place_of_birth_id` int(11) NOT NULL,
  `lga_id` int(11) NOT NULL,
  `place_of_issuance` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `spouse_id` (`spouse_id`),
  KEY `identification_id` (`identification_id`),
  KEY `education_id` (`education_id`),
  KEY `occupation_id` (`occupation_id`),
  KEY `place_of_birth_id` (`place_of_birth_id`),
  KEY `lga_id` (`lga_id`),
  CONSTRAINT `applicants_ibfk_1` FOREIGN KEY (`spouse_id`) REFERENCES `client_spouse` (`id`),
  CONSTRAINT `applicants_ibfk_2` FOREIGN KEY (`identification_id`) REFERENCES `identification` (`id`),
  CONSTRAINT `applicants_ibfk_3` FOREIGN KEY (`education_id`) REFERENCES `education` (`id`),
  CONSTRAINT `applicants_ibfk_4` FOREIGN KEY (`occupation_id`) REFERENCES `occupation` (`id`),
  CONSTRAINT `applicants_ibfk_5` FOREIGN KEY (`place_of_birth_id`) REFERENCES `state` (`id`),
  CONSTRAINT `applicants_ibfk_6` FOREIGN KEY (`lga_id`) REFERENCES `lga` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `approve_authority` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `loan_id` char(36) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
  `role_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `status` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `loan_id` (`loan_id`),
  KEY `role_id` (`role_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `approve_authority_ibfk_1` FOREIGN KEY (`loan_id`) REFERENCES `loans` (`id`),
  CONSTRAINT `approve_authority_ibfk_2` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`),
  CONSTRAINT `approve_authority_ibfk_3` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `audit_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `action` varchar(255) NOT NULL,
  `more_description` text NOT NULL,
  `user_id` int(11) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `bank_details` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `bank_name` varchar(255) NOT NULL,
  `account_number` varchar(100) NOT NULL,
  `account_name` varchar(255) NOT NULL,
  `iban_number` varchar(255) DEFAULT NULL,
  `routing_number` varchar(255) DEFAULT NULL,
  `swift_code` varchar(255) DEFAULT NULL,
  `branch_sort_code` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `banks` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `code` varchar(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `bdc_bank_details` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `bank_id` int(11) NOT NULL,
  `account_number` varchar(100) NOT NULL,
  `account_name` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `bdc_bank_details_account_number` (`account_number`),
  KEY `bank_id` (`bank_id`),
  CONSTRAINT `bdc_bank_details_ibfk_1` FOREIGN KEY (`bank_id`) REFERENCES `banks` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `bdc_order_reports` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `file_path` text NOT NULL,
  `generated_by` int(11) NOT NULL,
  `generated_at` date NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `bdc_order_reports_generated_at` (`generated_at`),
  KEY `generated_by` (`generated_by`),
  CONSTRAINT `bdc_order_reports_ibfk_1` FOREIGN KEY (`generated_by`) REFERENCES `user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `bdc_orders` (
  `id` char(36) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
  `refrence_no` varchar(50) NOT NULL,
  `customer` json NOT NULL,
  `transaction_type` enum('buy','sell') NOT NULL,
  `currency_type_id` int(11) NOT NULL,
  `volume` decimal(13,2) NOT NULL,
  `exchange_rate` decimal(13,2) NOT NULL,
  `mode_of_payment` enum('wire','cash','wire/cash') NOT NULL,
  `cash_payment` decimal(13,2) DEFAULT NULL,
  `bdc_bank_detail_id` int(11) DEFAULT NULL,
  `bdc_company` varchar(70) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `status` enum('pending','completed') NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `currency_type_id` (`currency_type_id`),
  KEY `bdc_bank_detail_id` (`bdc_bank_detail_id`),
  KEY `bdc_orders_user_id_foreign_idx` (`user_id`),
  CONSTRAINT `bdc_orders_ibfk_1` FOREIGN KEY (`currency_type_id`) REFERENCES `currency_types` (`id`),
  CONSTRAINT `bdc_orders_ibfk_2` FOREIGN KEY (`bdc_bank_detail_id`) REFERENCES `bdc_bank_details` (`id`),
  CONSTRAINT `bdc_orders_user_id_foreign_idx` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `bdc_stock_balances` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `bdc_stock_id` int(11) NOT NULL,
  `opening_balance` decimal(13,2) NOT NULL,
  `closing_balance` decimal(13,2) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `bdc_stock_id` (`bdc_stock_id`),
  CONSTRAINT `bdc_stock_balances_ibfk_1` FOREIGN KEY (`bdc_stock_id`) REFERENCES `bdc_stocks` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `bdc_stocks` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `currency_type_id` int(11) NOT NULL,
  `stock_balance` decimal(13,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `currency_type_id` (`currency_type_id`),
  CONSTRAINT `bdc_stocks_ibfk_1` FOREIGN KEY (`currency_type_id`) REFERENCES `currency_types` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `business_employment` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `applicant_id` char(36) CHARACTER SET utf8 COLLATE utf8_bin DEFAULT NULL,
  `business_name` text NOT NULL,
  `business_office_address` text NOT NULL,
  `business_activity` text NOT NULL,
  `year_of_experience` int(11) NOT NULL,
  `office_phone_no` varchar(50) NOT NULL,
  `email_address` varchar(255) NOT NULL,
  `position` varchar(255) NOT NULL,
  `monthly_income` varchar(50) NOT NULL,
  `monthly_expenses` varchar(50) NOT NULL,
  `business_employment_type_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `business_employment_type_id` (`business_employment_type_id`),
  KEY `business_employment_applicant_id_foreign_idx` (`applicant_id`),
  CONSTRAINT `business_employment_applicant_id_foreign_idx` FOREIGN KEY (`applicant_id`) REFERENCES `applicants` (`id`),
  CONSTRAINT `business_employment_ibfk_1` FOREIGN KEY (`business_employment_type_id`) REFERENCES `business_employment_type` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `business_employment_type` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `check_lists` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `title` varchar(100) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `city` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `state_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `state_id` (`state_id`),
  CONSTRAINT `city_ibfk_1` FOREIGN KEY (`state_id`) REFERENCES `state` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `client_bank` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `bank_id` int(11) NOT NULL,
  `applicant_id` char(36) CHARACTER SET utf8 COLLATE utf8_bin DEFAULT NULL,
  `account_number` varchar(20) NOT NULL,
  `confirmed` tinyint(1) NOT NULL DEFAULT '0',
  `account_name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `bank_id` (`bank_id`),
  KEY `client_bank_applicant_id_foreign_idx` (`applicant_id`),
  CONSTRAINT `client_bank_applicant_id_foreign_idx` FOREIGN KEY (`applicant_id`) REFERENCES `applicants` (`id`),
  CONSTRAINT `client_bank_ibfk_1` FOREIGN KEY (`bank_id`) REFERENCES `banks` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `client_spouse` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `phone_number` varchar(20) NOT NULL,
  `occupation_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `occupation_id` (`occupation_id`),
  CONSTRAINT `client_spouse_ibfk_1` FOREIGN KEY (`occupation_id`) REFERENCES `occupation` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `credequity_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `api_url` varchar(255) NOT NULL,
  `req_status` tinyint(1) NOT NULL,
  `req_payload` json NOT NULL,
  `res_payload` json DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `credequity_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `currency_types` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) DEFAULT NULL,
  `locale` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `department` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `slug` varchar(120) NOT NULL,
  `loan_process_order` int(11) NOT NULL,
  `description` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `education` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `fx_beneficiaries` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `customer_kyc_id` int(11) NOT NULL,
  `bank_name` varchar(200) NOT NULL,
  `account_number` varchar(100) NOT NULL,
  `account_name` varchar(200) NOT NULL,
  `iban_number` varchar(150) DEFAULT NULL,
  `routing_number` varchar(100) DEFAULT NULL,
  `swift_code` varchar(100) DEFAULT NULL,
  `branch_sort_code` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fx_beneficiaries_account_number_iban_number` (`account_number`,`iban_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `fx_order_comments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fx_order_id` char(36) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL,
  `user_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `comment` text NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `fx_order_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fx_order_id` char(36) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
  `comment` text,
  `timeline` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `from_id` int(11) NOT NULL,
  `to_id` int(11) NOT NULL,
  `from_who_id` int(11) NOT NULL,
  `assign_to_id` int(11) DEFAULT NULL,
  `dept_id` int(11) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `from_id` (`from_id`),
  KEY `to_id` (`to_id`),
  KEY `from_who_id` (`from_who_id`),
  KEY `assign_to_id` (`assign_to_id`),
  KEY `dept_id` (`dept_id`),
  KEY `fx_order_logs_fx_order_id_foreign_idx` (`fx_order_id`),
  CONSTRAINT `fx_order_logs_fx_order_id_foreign_idx` FOREIGN KEY (`fx_order_id`) REFERENCES `fx_orders` (`id`),
  CONSTRAINT `fx_order_logs_ibfk_2` FOREIGN KEY (`from_id`) REFERENCES `fx_states` (`id`),
  CONSTRAINT `fx_order_logs_ibfk_3` FOREIGN KEY (`to_id`) REFERENCES `fx_states` (`id`),
  CONSTRAINT `fx_order_logs_ibfk_4` FOREIGN KEY (`from_who_id`) REFERENCES `user` (`id`),
  CONSTRAINT `fx_order_logs_ibfk_5` FOREIGN KEY (`assign_to_id`) REFERENCES `user` (`id`),
  CONSTRAINT `fx_order_logs_ibfk_6` FOREIGN KEY (`dept_id`) REFERENCES `department` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `fx_order_support_doc` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fx_order_id` char(36) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
  `description` text NOT NULL,
  `doc_url` varchar(255) NOT NULL,
  `upload_by_id` int(11) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fx_order_id` (`fx_order_id`),
  KEY `upload_by_id` (`upload_by_id`),
  CONSTRAINT `fx_order_support_doc_ibfk_1` FOREIGN KEY (`fx_order_id`) REFERENCES `fx_orders` (`id`),
  CONSTRAINT `fx_order_support_doc_ibfk_2` FOREIGN KEY (`upload_by_id`) REFERENCES `user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `fx_orders` (
  `id` char(36) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
  `reference_no` varchar(100) NOT NULL,
  `invoice_no` varchar(100) DEFAULT NULL,
  `volume` decimal(13,2) NOT NULL,
  `exchange_rate` decimal(13,2) NOT NULL,
  `currency_from_id` int(11) NOT NULL,
  `currency_to_id` int(11) NOT NULL,
  `total_payment` decimal(13,2) NOT NULL,
  `bank_charges` decimal(13,2) NOT NULL DEFAULT '0.00',
  `other_charges` decimal(13,2) DEFAULT NULL,
  `transaction_type_id` int(11) NOT NULL,
  `tranx_purpose` text,
  `invoice_url_path` varchar(255) DEFAULT NULL,
  `priority` varchar(255) NOT NULL,
  `customer` json NOT NULL,
  `receiving_bank_id` int(11) NOT NULL,
  `payment_source` text NOT NULL,
  `beneficiary_details` text NOT NULL,
  `kyc_status` tinyint(1) DEFAULT '0',
  `user_id` int(11) DEFAULT NULL,
  `current_state_id` int(11) DEFAULT NULL,
  `current_step_id` int(11) NOT NULL,
  `authorize_file_url` varchar(255) DEFAULT NULL,
  `client_approve` enum('accepted','rejected','pending') DEFAULT NULL,
  `authorize_token` text,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `reference_no` (`reference_no`),
  UNIQUE KEY `invoice_no` (`invoice_no`),
  KEY `currency_from_id` (`currency_from_id`),
  KEY `currency_to_id` (`currency_to_id`),
  KEY `transaction_type_id` (`transaction_type_id`),
  KEY `receiving_bank_id` (`receiving_bank_id`),
  KEY `current_state_id` (`current_state_id`),
  KEY `current_step_id` (`current_step_id`),
  KEY `fx_orders_user_id_foreign_idx` (`user_id`),
  CONSTRAINT `fx_orders_ibfk_1` FOREIGN KEY (`currency_from_id`) REFERENCES `currency_types` (`id`),
  CONSTRAINT `fx_orders_ibfk_2` FOREIGN KEY (`currency_to_id`) REFERENCES `currency_types` (`id`),
  CONSTRAINT `fx_orders_ibfk_3` FOREIGN KEY (`transaction_type_id`) REFERENCES `transaction_types` (`id`),
  CONSTRAINT `fx_orders_ibfk_4` FOREIGN KEY (`receiving_bank_id`) REFERENCES `bank_details` (`id`),
  CONSTRAINT `fx_orders_ibfk_5` FOREIGN KEY (`current_state_id`) REFERENCES `fx_states` (`id`),
  CONSTRAINT `fx_orders_ibfk_6` FOREIGN KEY (`current_step_id`) REFERENCES `department` (`id`),
  CONSTRAINT `fx_orders_user_id_foreign_idx` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `fx_states` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `message` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `identification` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_card_number` varchar(255) NOT NULL,
  `date_issued` datetime NOT NULL,
  `expiry_date_issued` datetime NOT NULL,
  `identity_type_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `identity_type_id` (`identity_type_id`),
  CONSTRAINT `identification_ibfk_1` FOREIGN KEY (`identity_type_id`) REFERENCES `identity_types` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `identity_types` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `lga` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `state_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `state_id` (`state_id`),
  CONSTRAINT `lga_ibfk_1` FOREIGN KEY (`state_id`) REFERENCES `state` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `loan_app_check_list` (
  `loan_application_id` char(36) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
  `check_list_id` int(11) NOT NULL,
  `doc_url` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`loan_application_id`,`check_list_id`),
  KEY `check_list_id` (`check_list_id`),
  CONSTRAINT `loan_app_check_list_ibfk_1` FOREIGN KEY (`loan_application_id`) REFERENCES `loans` (`id`),
  CONSTRAINT `loan_app_check_list_ibfk_2` FOREIGN KEY (`check_list_id`) REFERENCES `check_lists` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `loan_app_comments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `loan_id` char(36) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
  `user_id` int(11) NOT NULL,
  `comment` text NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `loan_id` (`loan_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `loan_app_comments_ibfk_1` FOREIGN KEY (`loan_id`) REFERENCES `loans` (`id`),
  CONSTRAINT `loan_app_comments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `loan_detail` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `loan_amount` varchar(100) NOT NULL,
  `repayment_frequency` enum('daily','weekly','monthly','quarterly','annually') NOT NULL,
  `monthly_repayment_amount` varchar(100) DEFAULT NULL,
  `maturity_tenor` varchar(150) NOT NULL,
  `collateral_offered` text NOT NULL,
  `loan_purpose` text NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `loan_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `comment` text NOT NULL,
  `timeline` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `loan_id` char(36) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
  `from_id` int(11) NOT NULL,
  `to_id` int(11) NOT NULL,
  `from_who_id` int(11) NOT NULL,
  `assign_to_id` int(11) DEFAULT NULL,
  `dept_id` int(11) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `loan_id` (`loan_id`),
  KEY `from_id` (`from_id`),
  KEY `to_id` (`to_id`),
  KEY `from_who_id` (`from_who_id`),
  KEY `assign_to_id` (`assign_to_id`),
  KEY `dept_id` (`dept_id`),
  CONSTRAINT `loan_logs_ibfk_1` FOREIGN KEY (`loan_id`) REFERENCES `loans` (`id`),
  CONSTRAINT `loan_logs_ibfk_2` FOREIGN KEY (`from_id`) REFERENCES `loan_states` (`id`),
  CONSTRAINT `loan_logs_ibfk_3` FOREIGN KEY (`to_id`) REFERENCES `loan_states` (`id`),
  CONSTRAINT `loan_logs_ibfk_4` FOREIGN KEY (`from_who_id`) REFERENCES `user` (`id`),
  CONSTRAINT `loan_logs_ibfk_5` FOREIGN KEY (`assign_to_id`) REFERENCES `user` (`id`),
  CONSTRAINT `loan_logs_ibfk_6` FOREIGN KEY (`dept_id`) REFERENCES `department` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `loan_sources` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) DEFAULT NULL,
  `slug` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `loan_states` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `slug` varchar(100) DEFAULT NULL,
  `order` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `loan_type` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `loans` (
  `id` char(36) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
  `applicant_id` char(36) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
  `refrence_no` varchar(50) NOT NULL,
  `collateral_offered` text NOT NULL,
  `maturity_tenor` varchar(150) NOT NULL,
  `monthly_repayment_amount` decimal(13,2) NOT NULL,
  `repayment_frequency` enum('daily','weekly','monthly','quarterly','annually') NOT NULL,
  `amount` decimal(13,2) NOT NULL,
  `repeat_loan` tinyint(1) NOT NULL,
  `purpose` text NOT NULL,
  `registration_status` enum('pending','completed','update_required') DEFAULT 'pending',
  `user_id` int(11) DEFAULT NULL,
  `require_approval` tinyint(1) NOT NULL DEFAULT '0',
  `current_state_id` int(11) DEFAULT NULL,
  `current_step_id` int(11) NOT NULL,
  `loan_type_id` int(11) NOT NULL,
  `business_employment_id` int(11) DEFAULT NULL,
  `bank_detail_id` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `loan_source_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `current_state_id` (`current_state_id`),
  KEY `current_step_id` (`current_step_id`),
  KEY `loan_type_id` (`loan_type_id`),
  KEY `business_employment_id` (`business_employment_id`),
  KEY `loans_applicant_id_foreign_idx` (`applicant_id`),
  KEY `loans_bank_detail_id_foreign_idx` (`bank_detail_id`),
  KEY `loans_refrence_no` (`refrence_no`),
  KEY `loans_user_id_foreign_idx` (`user_id`),
  CONSTRAINT `loans_applicant_id_foreign_idx` FOREIGN KEY (`applicant_id`) REFERENCES `applicants` (`id`),
  CONSTRAINT `loans_bank_detail_id_foreign_idx` FOREIGN KEY (`bank_detail_id`) REFERENCES `client_bank` (`id`),
  CONSTRAINT `loans_ibfk_10` FOREIGN KEY (`business_employment_id`) REFERENCES `business_employment` (`id`),
  CONSTRAINT `loans_ibfk_2` FOREIGN KEY (`current_state_id`) REFERENCES `loan_states` (`id`),
  CONSTRAINT `loans_ibfk_3` FOREIGN KEY (`current_step_id`) REFERENCES `department` (`id`),
  CONSTRAINT `loans_ibfk_4` FOREIGN KEY (`loan_type_id`) REFERENCES `loan_type` (`id`),
  CONSTRAINT `loans_user_id_foreign_idx` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `occupation` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `permissions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `role_permission` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `role_id` int(11) NOT NULL,
  `permission_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `role_id` (`role_id`),
  KEY `permission_id` (`permission_id`),
  CONSTRAINT `role_permission_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`),
  CONSTRAINT `role_permission_ibfk_2` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `roles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `code` varchar(120) NOT NULL,
  `description` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


CREATE TABLE `state` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(150) DEFAULT NULL,
  `lat` varchar(50) DEFAULT NULL,
  `lng` varchar(50) DEFAULT NULL,
  `min_lng` varchar(50) DEFAULT NULL,
  `max_lng` varchar(50) DEFAULT NULL,
  `min_lat` varchar(50) DEFAULT NULL,
  `max_lat` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `transaction_types` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `user` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fullname` varchar(255) NOT NULL,
  `username` varchar(70) NOT NULL,
  `email` varchar(100) NOT NULL,
  `phone_number` varchar(30) NOT NULL,
  `password` text NOT NULL,
  `is_disabled` tinyint(1) DEFAULT '0',
  `last_login_ip` varchar(20) DEFAULT NULL,
  `last_login_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `department_id` int(11) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `reset_token` varchar(100) DEFAULT NULL,
  `reset_expires` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `username_2` (`username`),
  UNIQUE KEY `phone_number` (`phone_number`),
  UNIQUE KEY `username_3` (`username`),
  UNIQUE KEY `phone_number_2` (`phone_number`),
  UNIQUE KEY `username_4` (`username`),
  UNIQUE KEY `phone_number_3` (`phone_number`),
  UNIQUE KEY `username_5` (`username`),
  UNIQUE KEY `phone_number_4` (`phone_number`),
  KEY `department_id` (`department_id`),
  KEY `user_username_phone_number` (`username`,`phone_number`),
  KEY `user_index_username` (`username`),
  KEY `user_index_phone_number` (`phone_number`),
  CONSTRAINT `user_ibfk_1` FOREIGN KEY (`department_id`) REFERENCES `department` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `user_roles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `role_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `role_id` (`role_id`),
  CONSTRAINT `user_roles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`),
  CONSTRAINT `user_roles_ibfk_2` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;



/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;