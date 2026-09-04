-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Sep 04, 2026 at 01:22 PM
-- Server version: 10.4.28-MariaDB
-- PHP Version: 8.2.4

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `db_bex_signature`
--

-- --------------------------------------------------------

--
-- Table structure for table `activity_history`
--

CREATE TABLE `activity_history` (
  `id` int(11) NOT NULL,
  `document_id` int(11) NOT NULL,
  `activity_description` text NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `activity_history`
--

INSERT INTO `activity_history` (`id`, `document_id`, `activity_description`, `ip_address`, `created_at`) VALUES
(1, 1, 'Document signed and completed in db_bex_signature via phpMyAdmin', '127.0.0.1', '2026-08-27 09:56:30'),
(2, 2, 'Document \"Document 1.pdf\" created/uploaded', '::1', '2026-08-27 10:12:11'),
(3, 3, 'Document \"sign 1.pdf\" created/uploaded', '::1', '2026-08-27 10:13:51'),
(4, 3, 'Document ID 3 electronically signed and marked Completed', '::1', '2026-08-27 10:30:54'),
(5, 4, 'Document \"Document 1.pdf\" created/uploaded', '::1', '2026-08-27 10:32:38'),
(6, 6, 'Document signed and completed in db_bex_signature via phpMyAdmin', '127.0.0.1', '2026-08-27 14:37:15'),
(7, 3, 'Document ID 3 electronically signed and marked Completed', '::1', '2026-09-01 15:46:16'),
(8, 6, 'Document ID 6 electronically signed and marked Completed', '::1', '2026-09-01 15:57:51'),
(9, 6, 'Document ID 6 electronically signed and marked Completed', '::1', '2026-09-01 16:21:24'),
(10, 6, 'Document ID 6 electronically signed and marked Completed', '::1', '2026-09-01 16:43:41'),
(11, 6, 'Document ID 6 electronically signed and marked Completed', '::1', '2026-09-01 16:52:12'),
(13, 8, 'Document \"vimal doc 1.pdf\" created/uploaded', '::1', '2026-09-01 18:14:43'),
(14, 9, 'Document \"PhpMyAdmin_Signature_Agreement_2026.pdf\" created/uploaded', '::1', '2026-09-01 18:16:02'),
(20, 15, 'Document \"Document 1 vimal.pdf\" created/uploaded', '::1', '2026-09-01 18:35:58'),
(21, 1, 'Document ID 1 electronically signed and marked Completed', '::1', '2026-09-01 20:05:27'),
(22, 16, 'Document \"Document 1.pdf\" created with ID: BEX-DOC-2026-0016-B5GEQ4IE-0E5O6C0RLR6BQW20XP6IFW', '::1', '2026-09-02 17:39:17'),
(23, 17, 'Document \"Test Document\" created with ID: BEX-DOC-2026-0017-LOV68F0G-BVBV8SSYYQ9PODGDOLIE4E', '::1', '2026-09-02 17:58:53'),
(24, 18, 'Document \"vimal signature document.pdf\" created with ID: BEX-DOC-2026-0018-K0I80G31-XLMMYE82UMNM9IEC0JIA', '::1', '2026-09-02 18:30:43'),
(25, 19, 'Document \"Document 1.pdf\" created with ID: BEX-DOC-2026-0019-ZSTV2BKJ-X718J699IGQH1W4UQL4458', '::1', '2026-09-02 19:55:15'),
(26, 20, 'Document \"vimal signature document.pdf\" created with ID: BEX-DOC-2026-0020-QL5KVYNA-KHT5B9WZQ55GSURCJFHX', '::1', '2026-09-02 19:55:31'),
(27, 20, 'Document \"vimal signature document.pdf\" dispatched for signature to vimal@bexcodeservices.com', '::1', '2026-09-03 04:35:07'),
(28, 20, 'Document ID 20 electronically signed by Vimal Chavda (vimal@bexcodeservices.com) and marked Completed', '::1', '2026-09-03 04:36:52'),
(29, 20, 'Document ID 20 electronically signed by Vimal Chavda (vimal@bexcodeservices.com) and marked Completed', '::1', '2026-09-03 04:45:23'),
(30, 19, 'Document \"Document 1.pdf\" dispatched for signature to vimal@bexcodeservices.com', '::1', '2026-09-03 18:57:08'),
(31, 19, 'Document ID 19 electronically signed by Vimal Chavda (vimal@bexcodeservices.com) and marked Completed', '::1', '2026-09-03 18:58:22'),
(32, 21, 'Document \"Document 1.pdf\" created with ID: BEX-DOC-2026-0021-YUSLG3FF-PQNAPLB67Z9G2G7P21YFOQ', '::1', '2026-09-03 19:10:21'),
(33, 21, 'Document \"Document 1.pdf\" dispatched for signature to vimal@bexcodeservices.com', '::1', '2026-09-03 19:11:13'),
(34, 21, 'Document ID 21 electronically signed by Vimal Chavda (vimal@bexcodeservices.com) and marked Completed', '::1', '2026-09-03 19:13:30'),
(35, 22, 'Document \"Doc Vimal N.pdf\" created with ID: BEX-DOC-2026-0022-5FMEM6VQ-ACSVWM4T8IU41F0QQW6BKN', '::1', '2026-09-03 19:53:13'),
(36, 23, 'Document \"My doc vimal 2.pdf\" created with ID: BEX-DOC-2026-0023-93GLQ14M-ER0N92361O5A0VNJ97DLMM', '::1', '2026-09-03 19:54:20'),
(37, 24, 'Document \"My doc vimal 2.pdf\" created with ID: BEX-DOC-2026-0024-E5JGIK41-LX89QGT3NHA4F9UDSZPQTX', '::1', '2026-09-03 20:16:04'),
(38, 24, 'Document \"Blank Agreement Document.pdf\" dispatched for signature to vimal@bexcodeservices.com', '::1', '2026-09-03 20:18:36'),
(39, 25, 'Document \"My doc vimal 2.pdf\" created with ID: BEX-DOC-2026-0025-TBZ01T9S-1VVSRD6WDIPUUS8ZLTV91', '::1', '2026-09-04 06:20:13'),
(40, 25, 'Document \"Standard Employment Agreement.pdf\" dispatched for signature to vimal@bexcodeservices.com', '::1', '2026-09-04 06:24:28'),
(41, 24, 'Document \"My doc vimal 2.pdf\" dispatched for signature to vimal@bexcodeservices.com', '::1', '2026-09-04 08:37:25'),
(42, 24, 'Document ID 24 electronically signed by Vimal Chavda (vimal@bexcodeservices.com) and marked Completed', '::1', '2026-09-04 08:38:24'),
(43, 26, 'Document \"vimal_doc_1.pdf\" created with ID: BEX-DOC-2026-0026-D0Z7KLHR-M4X0U23OHEQUFE5P658Q8Q', '::1', '2026-09-04 08:49:33'),
(44, 26, 'Document \"vimal_doc_1.pdf\" dispatched for signature to vimal@bexcodeservices.com', '::1', '2026-09-04 08:50:23'),
(45, 26, 'Document ID 26 electronically signed by Vimal Chavda (vimal@bexcodeservices.com) and marked Completed', '::1', '2026-09-04 08:51:16'),
(46, 25, 'Document ID 25 electronically signed by Vimal Chavda (vimal@bexcodeservices.com) and marked Completed', '::1', '2026-09-04 10:53:29'),
(47, 1, 'Document \"vimal_doc_1.pdf\" dispatched for signature to vimal@bexcodeservices.com', '::1', '2026-09-04 11:16:56');

-- --------------------------------------------------------

--
-- Table structure for table `activity_logs`
--

CREATE TABLE `activity_logs` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `action` varchar(255) NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `browser_info` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `announcements`
--

CREATE TABLE `announcements` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `api_keys`
--

CREATE TABLE `api_keys` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `api_key` varchar(255) NOT NULL,
  `permissions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`permissions`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `api_logs`
--

CREATE TABLE `api_logs` (
  `id` int(11) NOT NULL,
  `api_key_id` int(11) DEFAULT NULL,
  `endpoint` varchar(255) NOT NULL,
  `method` varchar(10) NOT NULL,
  `status_code` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` int(11) NOT NULL,
  `document_id` int(11) NOT NULL,
  `action_summary` text NOT NULL,
  `checksum_hash` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `contacts`
--

CREATE TABLE `contacts` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL,
  `email` varchar(255) NOT NULL,
  `company` varchar(150) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `last_used` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `delegates`
--

CREATE TABLE `delegates` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `delegate_to_email` varchar(255) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `reason` text DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `documents`
--

CREATE TABLE `documents` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `document_name` varchar(255) NOT NULL,
  `file_path` varchar(255) DEFAULT NULL,
  `folder_name` varchar(150) DEFAULT 'General',
  `status` enum('Draft','Scheduled','In Progress','Completed','Declined','Expired','Recalled','Trashed','Failed') DEFAULT 'Draft',
  `signing_order` enum('parallel','sequential') DEFAULT 'parallel',
  `recipient_email` varchar(255) DEFAULT NULL,
  `template_used` varchar(150) DEFAULT NULL,
  `custom_message` text DEFAULT NULL,
  `reminder_days` int(11) DEFAULT 3,
  `expiration_days` int(11) DEFAULT 30,
  `scheduled_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `documents`
--

INSERT INTO `documents` (`id`, `user_id`, `document_name`, `file_path`, `folder_name`, `status`, `signing_order`, `recipient_email`, `template_used`, `custom_message`, `reminder_days`, `expiration_days`, `scheduled_at`, `completed_at`, `created_at`, `updated_at`) VALUES
(1, 1, 'PhpMyAdmin_Signature_Agreement_2026.pdf', NULL, 'General', 'In Progress', 'parallel', 'vimal@bexcodeservices.com', NULL, NULL, 3, 30, NULL, '2026-08-27 15:26:30', '2026-08-27 09:56:29', '2026-09-04 11:16:52'),
(2, 1, 'Document 1.pdf', '/uploads/sample.pdf', 'Unsorted', 'Draft', 'parallel', 'john@example.com', NULL, NULL, 3, 30, NULL, NULL, '2026-08-27 10:12:11', '2026-08-27 10:12:11'),
(3, 1, 'sign 1.pdf', '/uploads/sample.pdf', 'Unsorted', 'Completed', 'parallel', 'john@example.com', NULL, NULL, 3, 30, NULL, NULL, '2026-08-27 10:13:51', '2026-08-27 10:30:54'),
(4, 1, 'Document 1.pdf', '/uploads/sample.pdf', 'Unsorted', 'Draft', 'parallel', 'john@example.com', NULL, NULL, 3, 30, NULL, NULL, '2026-08-27 10:32:38', '2026-08-27 10:32:38'),
(5, 1, 'PhpMyAdmin_Signature_Agreement_2026.pdf', NULL, 'General', 'Draft', 'parallel', 'vimal@bexcodeservices.com', NULL, NULL, 3, 30, NULL, NULL, '2026-08-27 14:32:52', '2026-08-27 14:32:52'),
(6, 1, 'PhpMyAdmin_Signature_Agreement_2026.pdf', NULL, 'General', 'Completed', 'parallel', 'vimal@bexcodeservices.com', NULL, NULL, 3, 30, NULL, '2026-08-27 20:07:15', '2026-08-27 14:37:15', '2026-08-27 14:37:15'),
(8, 1, 'vimal doc 1.pdf', '/uploads/sample.pdf', 'None', 'Draft', 'parallel', 'john@example.com', NULL, NULL, 3, 30, NULL, NULL, '2026-09-01 18:14:43', '2026-09-01 18:14:43'),
(9, 1, 'PhpMyAdmin_Signature_Agreement_2026.pdf', '/uploads/sample.pdf', 'None', 'Draft', 'parallel', 'vimal@bexcodeservices.com', NULL, NULL, 3, 30, NULL, NULL, '2026-09-01 18:16:02', '2026-09-01 18:16:02'),
(15, 1, 'Document 1 vimal.pdf', '/uploads/sample.pdf', 'None', 'Draft', 'sequential', 'vimal@bexcodeservices.com', NULL, NULL, 5, 15, NULL, NULL, '2026-09-01 18:35:58', '2026-09-02 17:26:35'),
(16, 1, 'Document 1.pdf', '/uploads/sample.pdf', 'None', 'Draft', 'sequential', 'vimal@bexcodeservices.com', NULL, 'notes here', 5, 15, NULL, NULL, '2026-09-02 17:39:17', '2026-09-02 17:40:07'),
(17, 1, 'Test Document', '/uploads/sample.pdf', 'None', 'Draft', 'sequential', 'vimal@bexcodeservices.com', NULL, NULL, 5, 15, NULL, NULL, '2026-09-02 17:58:53', '2026-09-02 17:58:53'),
(18, 1, 'vimal signature document.pdf', '/uploads/sample.pdf', 'None', 'Draft', 'sequential', 'vimal@bexcodeservices.com', NULL, 'please note this signed document and proceed for this', 5, 15, NULL, NULL, '2026-09-02 18:30:43', '2026-09-02 18:31:23'),
(19, 1, 'Document 1.pdf', '/uploads/sample.pdf', 'None', 'Completed', 'sequential', 'vimal@bexcodeservices.com', NULL, NULL, 5, 15, NULL, NULL, '2026-09-02 19:55:15', '2026-09-03 18:58:19'),
(20, 1, 'vimal signature document.pdf', '/uploads/sample.pdf', 'None', 'Completed', 'sequential', 'vimal@bexcodeservices.com', NULL, NULL, 5, 15, NULL, NULL, '2026-09-02 19:55:31', '2026-09-03 04:36:48'),
(21, 1, 'Document 1.pdf', '/uploads/sample.pdf', 'None', 'Completed', 'sequential', 'vimal@bexcodeservices.com', NULL, NULL, 5, 15, NULL, NULL, '2026-09-03 19:10:21', '2026-09-03 19:13:27'),
(22, 1, 'Doc Vimal N.pdf', '/uploads/sample.pdf', 'General', 'Draft', 'parallel', 'vimal@bexcodeservices.com', NULL, NULL, 3, 30, NULL, NULL, '2026-09-03 19:53:13', '2026-09-03 19:53:13'),
(23, 1, 'My doc vimal 2.pdf', '/uploads/sample.pdf', 'None', 'Draft', 'sequential', 'vimal@bexcodeservices.com', NULL, NULL, 5, 15, NULL, NULL, '2026-09-03 19:54:20', '2026-09-03 19:54:22'),
(24, 1, 'second document.pdf', '/uploads/sample.pdf', 'None', 'Completed', 'sequential', 'vimal@bexcodeservices.com', NULL, NULL, 5, 15, NULL, NULL, '2026-09-03 20:16:04', '2026-09-04 08:38:21'),
(25, 1, 'My doc vimal 2.pdf', '/uploads/sample.pdf', 'None', 'Completed', 'sequential', 'vimal@bexcodeservices.com', NULL, NULL, 5, 15, NULL, NULL, '2026-09-04 06:20:13', '2026-09-04 10:53:26'),
(26, 1, 'vimal_doc_1.pdf', '/uploads/sample.pdf', 'None', 'Completed', 'sequential', 'vimal@bexcodeservices.com', NULL, NULL, 5, 15, NULL, NULL, '2026-09-04 08:49:32', '2026-09-04 08:51:13');

-- --------------------------------------------------------

--
-- Table structure for table `document_fields`
--

CREATE TABLE `document_fields` (
  `id` int(11) NOT NULL,
  `document_id` int(11) NOT NULL,
  `recipient_id` int(11) DEFAULT NULL,
  `page_number` int(11) DEFAULT 1,
  `field_type` varchar(50) NOT NULL,
  `label` varchar(100) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_required` tinyint(1) DEFAULT 1,
  `pos_x` float NOT NULL,
  `pos_y` float NOT NULL,
  `width` float DEFAULT 150,
  `height` float DEFAULT 40,
  `options` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`options`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `document_fields`
--

INSERT INTO `document_fields` (`id`, `document_id`, `recipient_id`, `page_number`, `field_type`, `label`, `description`, `is_required`, `pos_x`, `pos_y`, `width`, `height`, `options`) VALUES
(1, 1, 1, 1, 'Signature', 'Signer Signature', NULL, 1, 180, 320, 150, 40, NULL),
(2, 6, 3, 1, 'Signature', 'Signer Signature', NULL, 1, 180, 320, 150, 40, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `document_field_values`
--

CREATE TABLE `document_field_values` (
  `id` int(11) NOT NULL,
  `field_id` int(11) NOT NULL,
  `recipient_id` int(11) NOT NULL,
  `field_value` text DEFAULT NULL,
  `submitted_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `document_files`
--

CREATE TABLE `document_files` (
  `id` int(11) NOT NULL,
  `document_id` int(11) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `file_size` int(11) DEFAULT NULL,
  `file_type` varchar(100) DEFAULT NULL,
  `uploaded_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `document_text` longtext DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `document_files`
--

INSERT INTO `document_files` (`id`, `document_id`, `file_name`, `file_path`, `file_size`, `file_type`, `uploaded_at`, `document_text`) VALUES
(6, 25, 'My doc vimal 2.pdf', '/uploads/sample.pdf', 1024, 'pdf', '2026-09-04 06:24:24', NULL),
(7, 25, 'Standard Employment Agreement.pdf', '/uploads/sample.pdf', 1024, 'pdf', '2026-09-04 06:24:24', NULL),
(8, 25, 'Blank Agreement Document.pdf', '/uploads/sample.pdf', 1024, 'pdf', '2026-09-04 06:24:24', NULL),
(9, 24, 'My doc vimal 2.pdf', '/uploads/sample.pdf', 1024, 'pdf', '2026-09-04 08:37:21', 'check the document for signature'),
(10, 24, 'second document.pdf', '/uploads/sample.pdf', 1024, 'pdf', '2026-09-04 08:37:21', 'check the document for signature'),
(12, 26, 'vimal_doc_1.pdf', '/uploads/sample.pdf', 1024, 'pdf', '2026-09-04 08:50:19', 'STANDARD EMPLOYMENT AGREEMENT\n\nThis Employment Agreement (the \"Agreement\") is made and entered into by and between Bexcode Services (the \"Company\") and the undersigned individual (the \"Employee\").\n\n1. APPOINTMENT AND SCOPE OF DUTIES\nThe Company agrees to employ the Employee, and the Employee agrees to faithfully perform all duties, services, and responsibilities associated with their designated role to the highest professional standards.\n\n2. COMPENSATION AND PERFORMANCE EVALUATION\nThe Employee shall be entitled to compensation as specified in their formal offer schedule, payable in accordance with the Company\'s standard payroll cycles, subject to applicable statutory deductions and annual performance evaluations.\n\n3. CONFIDENTIALITY AND PROPRIETARY ASSETS\nThe Employee acknowledges that in the course of employment, they will have access to confidential business information, proprietary source code, internal strategies, and trade secrets. The Employee covenants not to disclose or misappropriate any such materials during or following the term of employment.\n\n4. INTELLECTUAL PROPERTY RIGHTS\nAll inventions, designs, source code, workflows, and documentation created or developed by the Employee in connection with their duties shall be the exclusive property of the Company from inception.\n\n5. GOVERNING LAW AND EXECUTION\nThis Agreement shall be governed by and construed in accordance with the governing laws. The parties hereto have caused this Agreement to be executed by their authorized digital signatures.'),
(13, 1, 'vimal_doc_1.pdf', '/uploads/sample.pdf', 1024, 'pdf', '2026-09-04 11:16:52', 'This is edit in the editor 1stt doc\n\nSTANDARD EMPLOYMENT AGREEMENT\n\nThis Employment Agreement (the \"Agreement\") is made and entered into by and between Bexcode Services (the \"Company\") and the undersigned individual (the \"Employee\").\n\n1. APPOINTMENT AND SCOPE OF DUTIES\nThe Company agrees to employ the Employee, and the Employee agrees to faithfully perform all duties, services, and responsibilities associated with their designated role to the highest professional standards.\n\n2. COMPENSATION AND PERFORMANCE EVALUATION\nThe Employee shall be entitled to compensation as specified in their formal offer schedule, payable in accordance with the Company\'s standard payroll cycles, subject to applicable statutory deductions and annual performance evaluations.\n\n3. CONFIDENTIALITY AND PROPRIETARY ASSETS\nThe Employee acknowledges that in the course of employment, they will have access to confidential business information, proprietary source code, internal strategies, and trade secrets. The Employee covenants not to disclose or misappropriate any such materials during or following the term of employment.\n\n4. INTELLECTUAL PROPERTY RIGHTS\nAll inventions, designs, source code, workflows, and documentation created or developed by the Employee in connection with their duties shall be the exclusive property of the Company from inception.\n\n5. GOVERNING LAW AND EXECUTION\nThis Agreement shall be governed by and construed in accordance with the governing laws. The parties hereto have caused this Agreement to be executed by their authorized digital signatures.');

-- --------------------------------------------------------

--
-- Table structure for table `document_identifiers`
--

CREATE TABLE `document_identifiers` (
  `id` int(11) NOT NULL,
  `document_id` int(11) NOT NULL,
  `bexsign_doc_id` varchar(100) NOT NULL,
  `prefix` varchar(20) DEFAULT 'BEX-DOC',
  `year` int(11) DEFAULT 2026,
  `seq_number` int(11) NOT NULL,
  `unique_hash` varchar(64) NOT NULL,
  `signer_name` varchar(150) DEFAULT 'Vimal Chavda',
  `signer_email` varchar(255) DEFAULT 'vimal@bexcodeservices.com',
  `signature_style` varchar(50) DEFAULT 'font-signature-1',
  `signature_image` longtext DEFAULT NULL,
  `signature_status` enum('Draft','In Progress','Completed','Recalled','Expired') DEFAULT 'Draft',
  `audit_ip` varchar(45) DEFAULT '223.181.69.208',
  `audit_hash` varchar(100) DEFAULT 'SHA256-CERTIFIED-ELECTRONIC-RECORD',
  `qr_payload` text DEFAULT NULL,
  `signed_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `document_identifiers`
--

INSERT INTO `document_identifiers` (`id`, `document_id`, `bexsign_doc_id`, `prefix`, `year`, `seq_number`, `unique_hash`, `signer_name`, `signer_email`, `signature_style`, `signature_image`, `signature_status`, `audit_ip`, `audit_hash`, `qr_payload`, `signed_at`, `created_at`, `updated_at`) VALUES
(2, 1, 'BEX-DOC-2026-0001-361682B4-ERZWVA2U19FQKOU0LTHEPYMCRKHTZR2MFDEBT65NAG', 'BEX-DOC', 2026, 1, '361682B4-ERZWVA2U19FQKOU0LTHEPYMCRKHTZR2MFDEBT65NAG', 'Vimal Chavda', 'vimal@bexcodeservices.com', 'font-signature-2', 'Vimal Chavda', 'Completed', '::1', 'SHA256-CERTIFIED-ELECTRONIC-RECORD', NULL, '2026-09-02 01:35:27', '2026-09-01 18:51:10', '2026-09-01 20:05:27'),
(3, 2, 'BEX-DOC-2026-0002-482719A1-XZM9VWP8L23KQRT7JBVTYUN08OPQRS56FGHJKL89', 'BEX-DOC', 2026, 2, '482719A1-XZM9VWP8L23KQRT7JBVTYUN08OPQRS56FGHJKL89', 'Dhruv patel', 'dhruv@bexcodeservices.com', 'font-signature-1', NULL, 'Completed', '223.181.69.208', 'SHA256-CERTIFIED-ELECTRONIC-RECORD', NULL, '2026-08-27 10:14:22', '2026-09-01 18:51:10', '2026-09-01 18:51:10'),
(4, 3, 'BEX-DOC-2026-0003-792015C3-KLMNOPQ845RSTUVW912XYZABC345DEF678GHI012', 'BEX-DOC', 2026, 3, '792015C3-KLMNOPQ845RSTUVW912XYZABC345DEF678GHI012', 'Vimal Chavda', 'vimal@bexcodeservices.com', 'font-signature-1', NULL, 'In Progress', '223.181.69.208', 'SHA256-CERTIFIED-ELECTRONIC-RECORD', NULL, NULL, '2026-09-01 18:51:10', '2026-09-01 18:51:10'),
(5, 4, 'BEX-DOC-2026-0004-920184F5-BCDEFGHIJKLMNOPQRSTUVWXYZA1234567890BCDEF', 'BEX-DOC', 2026, 4, '920184F5-BCDEFGHIJKLMNOPQRSTUVWXYZA1234567890BCDEF', 'Vimal Chavda', 'vimal@bexcodeservices.com', 'font-signature-1', NULL, 'In Progress', '223.181.69.208', 'SHA256-CERTIFIED-ELECTRONIC-RECORD', NULL, NULL, '2026-09-01 18:51:10', '2026-09-01 18:51:10'),
(6, 5, 'BEX-DOC-2026-0005-A1B2C3D4-E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4', 'BEX-DOC', 2026, 5, 'A1B2C3D4-E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4', 'Manu Yadav', 'manu.yadav@oladigital.health', 'font-signature-1', NULL, 'Draft', '223.181.69.208', 'SHA256-CERTIFIED-ELECTRONIC-RECORD', NULL, NULL, '2026-09-01 18:51:10', '2026-09-01 18:51:10'),
(8, 6, 'BEX-DOC-2026-0006-BWTDWUUD-T8GXL5TEDYMZAPXCWXX5K71290348719238471293', 'BEX-DOC', 2026, 6, 'BWTDWUUD-T8GXL5TEDYMZAPXCWXX5K71290348719238471293', 'Vimal Chavda', 'vimal@bexcodeservices.com', 'font-signature-1', NULL, 'Draft', '223.181.69.208', 'SHA256-CERTIFIED-ELECTRONIC-RECORD', NULL, NULL, '2026-09-01 18:51:10', '2026-09-01 18:51:10'),
(10, 15, 'BEX-DOC-2026-0015-LAFI37HC-KBXSLL1UKWEFEC7SWXTA8T', 'BEX-DOC', 2026, 15, 'LAFI37HC-KBXSLL1UKWEFEC7SWXTA8T', 'Vimal Chavda', 'vimal@bexcodeservices.com', 'font-signature-1', NULL, 'Draft', '223.181.69.208', 'SHA256-CERTIFIED-ELECTRONIC-RECORD', NULL, NULL, '2026-09-02 17:26:32', '2026-09-02 17:26:32'),
(11, 16, 'BEX-DOC-2026-0016-B5GEQ4IE-0E5O6C0RLR6BQW20XP6IFW', 'BEX-DOC', 2026, 16, 'B5GEQ4IE-0E5O6C0RLR6BQW20XP6IFW', 'Vimal Chavda', 'vimal@bexcodeservices.com', 'font-signature-1', NULL, 'Draft', '223.181.69.208', 'SHA256-CERTIFIED-ELECTRONIC-RECORD', NULL, NULL, '2026-09-02 17:39:17', '2026-09-02 17:39:17'),
(12, 17, 'BEX-DOC-2026-0017-LOV68F0G-BVBV8SSYYQ9PODGDOLIE4E', 'BEX-DOC', 2026, 17, 'LOV68F0G-BVBV8SSYYQ9PODGDOLIE4E', 'Vimal Chavda', 'vimal@bexcodeservices.com', 'font-signature-1', NULL, 'Draft', '223.181.69.208', 'SHA256-CERTIFIED-ELECTRONIC-RECORD', NULL, NULL, '2026-09-02 17:58:53', '2026-09-02 17:58:53'),
(13, 18, 'BEX-DOC-2026-0018-K0I80G31-XLMMYE82UMNM9IEC0JIA', 'BEX-DOC', 2026, 18, 'K0I80G31-XLMMYE82UMNM9IEC0JIA', 'Vimal Chavda', 'vimal@bexcodeservices.com', 'font-signature-1', NULL, 'Draft', '223.181.69.208', 'SHA256-CERTIFIED-ELECTRONIC-RECORD', NULL, NULL, '2026-09-02 18:30:43', '2026-09-02 18:30:43'),
(14, 19, 'BEX-DOC-2026-0019-ZSTV2BKJ-X718J699IGQH1W4UQL4458', 'BEX-DOC', 2026, 19, 'ZSTV2BKJ-X718J699IGQH1W4UQL4458', 'Vimal Chavda', 'vimal@bexcodeservices.com', 'font-signature-2', 'Vimal Chavda', 'Completed', '::1', 'SHA256-CERTIFIED-ELECTRONIC-RECORD', NULL, '2026-09-04 00:28:19', '2026-09-02 19:55:15', '2026-09-03 18:58:19'),
(15, 20, 'BEX-DOC-2026-0020-QL5KVYNA-KHT5B9WZQ55GSURCJFHX', 'BEX-DOC', 2026, 20, 'QL5KVYNA-KHT5B9WZQ55GSURCJFHX', 'Vimal Chavda', 'vimal@bexcodeservices.com', 'font-signature-1', 'data:image/png;base64,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', 'Completed', '::1', 'SHA256-CERTIFIED-ELECTRONIC-RECORD', NULL, '2026-09-03 10:15:19', '2026-09-02 19:55:31', '2026-09-03 04:45:19'),
(16, 21, 'BEX-DOC-2026-0021-YUSLG3FF-PQNAPLB67Z9G2G7P21YFOQ', 'BEX-DOC', 2026, 21, 'YUSLG3FF-PQNAPLB67Z9G2G7P21YFOQ', 'Vimal Chavda', 'vimal@bexcodeservices.com', 'font-signature-2', 'data:image/png;base64,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', 'Completed', '::1', 'SHA256-CERTIFIED-ELECTRONIC-RECORD', NULL, '2026-09-04 00:43:27', '2026-09-03 19:10:21', '2026-09-03 19:13:27'),
(17, 22, 'BEX-DOC-2026-0022-5FMEM6VQ-ACSVWM4T8IU41F0QQW6BKN', 'BEX-DOC', 2026, 22, '5FMEM6VQ-ACSVWM4T8IU41F0QQW6BKN', 'Vimal Chavda', 'vimal@bexcodeservices.com', 'font-signature-1', NULL, 'Draft', '223.181.69.208', 'SHA256-CERTIFIED-ELECTRONIC-RECORD', NULL, NULL, '2026-09-03 19:53:13', '2026-09-03 19:53:13'),
(18, 23, 'BEX-DOC-2026-0023-93GLQ14M-ER0N92361O5A0VNJ97DLMM', 'BEX-DOC', 2026, 23, '93GLQ14M-ER0N92361O5A0VNJ97DLMM', 'Vimal Chavda', 'vimal@bexcodeservices.com', 'font-signature-1', NULL, 'Draft', '223.181.69.208', 'SHA256-CERTIFIED-ELECTRONIC-RECORD', NULL, NULL, '2026-09-03 19:54:20', '2026-09-03 19:54:20'),
(19, 24, 'BEX-DOC-2026-0024-E5JGIK41-LX89QGT3NHA4F9UDSZPQTX', 'BEX-DOC', 2026, 24, 'E5JGIK41-LX89QGT3NHA4F9UDSZPQTX', 'Vimal Chavda', 'vimal@bexcodeservices.com', 'font-signature-2', 'data:image/png;base64,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', 'Completed', '::1', 'SHA256-CERTIFIED-ELECTRONIC-RECORD', NULL, '2026-09-04 14:08:21', '2026-09-03 20:16:04', '2026-09-04 08:38:21'),
(20, 25, 'BEX-DOC-2026-0025-TBZ01T9S-1VVSRD6WDIPUUS8ZLTV91', 'BEX-DOC', 2026, 25, 'TBZ01T9S-1VVSRD6WDIPUUS8ZLTV91', 'Vimal Chavda', 'vimal@bexcodeservices.com', 'font-signature-2', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAbgAAACMCAYAAAAOVry8AAAQAElEQVR4Aeyde4wjyV3Hq9r2vO2eu5219y6rcLu30Y49l5cChCAglz9AECEURECIIKQQIDoIENCR5IQiLiIgwimKQEFCgBBRjj8OBEKc8gcP6RIFJVFQIrHZsWf39gFiLxl7ZnfHnn3Mw+7Kr2x3u9prz7Y93e2q9rfl6vpVdXXVrz7l6e9Uv2wxLCAAAiAAAiCQQAIQuAQOKroEAiAAAiDAGAQO34LxCWBPEAABENCYAARO48GBayAAAiAAAuMTgMCNzw57ggAIjE8Ae4JA5AQgcJEjRgMgAAIgAAKTIACBmwR1tAkCIAACIDA+gYB7QuACgkIxEAABEAABswhA4MwaL3gLAiAAAiAQkAAELiCo6SqG3oIACICA+QQgcOaPIXoAAiAAAiAwgAAEbgAUZIEACIxPAHuCgC4EIHC6jAT8AAEQAAEQCJUABC5UnKgMBEAABEBgfALh7gmBC5cnalMIrKycz9qF4iu5Qumikg0TBEAABGIhAIGLBfN0NtJM87cxxp/mjK3l8qXnGRYQAAEQiJEABC5G2Bo0FasLTsuaj7VBNAYCIAACCgEInAIDZrgELEucd2vkXLzTtRGDAAiAQBwEIHBxUEYbIJAEAugDCBhGAAJn2IDBXRAAARAAgWAEIHDBOKHUGAQcwbLubkLwtGsjBgEQmDoCE+kwBG4i2KejUfpyFdye0jW4066NGARAAATiIEDHoDiaQRsgAAIgAAIgEC8BCFy8vCNrTceKHW494vpFpyjnXBsxCIAACMRBAAIXB+UpbYMLseB2nTMGgXNhIAYBEIiFAAQuFszT2YjgfLHXc5Hu2bD0IgBvQCCZBCBwyRxXXXrVO0XJ2YwuTsEPEACB6SBgTUc30ctJEKBTlLNeu4Lju+bBgAECySGgc09w0NF5dAz3TTCG75fhYwj3QcBkAjgAmTx6mvvOGe/N4JjAdy2k8Url3vi+pZXzzezJYiuXLzrdICg+VrDzReGFQknYEYTF5bP3QsKAakDgoQRw0HkoogkXMLt5fL/GGL9M5uRbsydX2+I1SGSW5lsvpmixLG7x3sLIPFagnZkXWDRLenYOvzARDVrUOoAADkADoCALBOIkkM4+cYdmX44rZguPnvymRQsJFo/TjzjaErTE0Q7aAAFJAAInKSCAQAwEpJC5IqbGiwsLi8cRM9IM4ThiUNAsz3EatQqOOTF819BEhwC+bB0OWINApAQWl8/tSyEbtRFBiyJeTrPZatarZa4GKRq7WxVL/7CRGrX/KA8CxyEAgTsOPex7NAEupv6ANpc7c1eefkzPzjz0OUDSMtEvYH3ilbp781LmaOjYCgIhEUhANRC4BAyirl0Qwvdwd+KuJw3j/siJ4kekqMnTkLPz8wv9px9JyBx1BubaUswgYMOoIh8ERicAgRudGfYAAeYKmBSx/uCk+af6Rc1F1qKFhGzqZ7YuD8QgECUBCFyUdI+sGxtNJSDFbZiADesTzdoEE+yDd7Yv4Z2cwyAhHwRCJgCBCxnooOrmVkpfYOzN7x+0DXlmEQgqblLQaLLWUk8/1mvlvzKrt/AWBMwmAIGLePzkAXE2xd5tFw7/dmll9TDi5lB9hATkWPbP3FwB64/pNKQV5Wwtwm6iahBIDAEIXPRD6d1cYVkc116i5z1SC9nXrZ6Qbw3Jniw6bpBC1n9dTaYHidtIjaEwCIBArAQgcLHiRmM6EJixz97Ldl+FZTWtbau9cE7/gLRDv5D1+yxPP8oZW38+0iBgBoHp8RICNz1jjZ52CczPzc1LTXuYkHWL+yIpbvL0oy8TCRAAAS0JQOC0HBY4FRUBvvD6etC6pZjJmZoaIG5B6aEcCEyeAAQu/DFAjRoTyGTSvjeBOLSoAiZtKWwyQMw0Hki4BgIBCEDgAkBCkTEJcKY+8+XdbDNmbZHstrv14PsRpbDJEEmDqBQEQCA2AhC42FCb3VD2sdIPy7sLsyeLjl04fyZgb/D9CgjKKwYDBEAgNAI4AIWGMtkVWY74krwpQ95pyFjqGvU2RcG4z+zMzKxxTsNhEACBsQhA4MbCNo07ca72mmZzRj60Lu+eVPsBGwQSRABd6SMAgesDgmQwApyWxZXit4OV1qPU0sr5purJ/b29+2oaNgiAQLIIaClwNDtoUhAzp8/9YrJwJ6s36RR/jK7J7Q7tldDrzS39s7eD+rWFob5jAwiAgPEEtBO4lZXzWZocpCiwuYPM53UiDF8eJEDX5JbonxHnwS3tHN8t+e2cCa7oO+WdZpWPAUzQFTQNAiAQAwHtBG57e2nP7TcdkKRp5M0M0vGkButgb1ntG40TZ+fODbp5wxMUtbwO9uFh08hriDqwgw8gYAoB7QSOsW/4Djy5/FrDFJjT4mcqlWn/IrXa31wj88D1LMGEht+vjtf3b786SJA7GyNZo1IQAIG4CWh5ABKM7bsgOBcLuUKp7KYR60PAcQQNVccfOYsbcKpS2xlcx2usQQAEkkxAS4GbZ+kTKnQ6ShYhcioRPezdrYrv+yNFTv6sjB7ewQsQSA4B9GQ8Ar4D1HhVhL9XtXrhrhDiklqzFDk7X/yWmgd78gTkuxv7vZAit7z8Ft91uv4ySIMACIBA1AS0FDjZ6UatskrnvyrS9gLnT3k2jIkR2N6+5Hs0QIoc/UNCw9VzScwe3GZCeHdR0uyutxEWCIAACMRAQFuBk31vVMslOmr6RE7ODuS2UAMqOzYB+ofEomtyvgepLYv7vl+5fGnn2A2hAhAAARAISMB3AAq4T6zFuiLn3XQiG6frcXsyRtCLAF2Ty9xrOZ8e7pXIDd+GLSAAAiAQLgHtBU52l0RuTsZuoOtxs3a+9BU3jThqAu96c9AWDrc3nu2fybn70mlKGjo3lZgYHQEBENCUgBECJ9nJ6zwy9gJn7/BsGJESyBU2PzpKA3Im139Nzt1/qVD6T9dGDAIgAAJREjBG4LoQrnbjdrScX/2DtoFVxAT4947agLwmN2gf7oinB+UjDwSmkgA6HSkBowSOZnHnVBoO4x9X07AjIiBYYZyaaby44zitcfbFPiAAAiBwXAJGCVy3s3e6MaNrOnhPpQsj2th76/6wU4/Dmt/d2kjTPr3NnPnutOxtgAUCIAAC4RIwTuBoVpBVEdiFku+ZLHUbY0iFQ0Ac6x8JOl3JpcjJsFur+G4YCsc/1AICIAACDxIwTuBkF+hAqZ72WpJ5CHoTkCIng95ewjsQAIEkETBS4CzOnmfKYheK/64kYUZKgKv/XETa0qQrR/sgAAJmEzBS4HaqlU/6sfMf9aeRCpMAXetUn1/DQ/ZhwkVdIAACkREwUuAkDTri4sXLEkTcgbPbcTeJ9kDAPALwWAcCxgrcTrX8JhVgLl86VNOwIyLA2cWIaka1IAACIBAqAWMFrkvBu4OSc5bu5iGKkMBd0fxchNWjahAAARAIjYCpAtcGUK+WfS/vtQtrV9obsAqNwNLjxV9XK2tVL7+kpk21F0+cx4zf1MGD3yAQkIDRAif76H9kQDwp8xDCI2A12Z+HV5s+NaXTKcz49RkOeAICkRAwXuDSjvV7Kpl0flXflzAL1VMzbM55yvXU/8+Em2tOfO/+/Xttb7ECARCYCgLGC9yt7fXPqCO1wPh/qWnY4REgsXs5vNrir+mwcR3XD+PHjhZBYGIEjBe4NjnBvtmOaUUH4WT0ifoy6U8uX2qoPtA1z59W0wbaBs6hDaScbJfRO4MIJEIM6rXy21Tm9qnSLTUNezwCnDPvvZ90ejIJ4vBb45HAXiAAAiYSSITAdcCLeiemtWCP0BqfEAlwbt0PsbpJVeV7zVj25KovPSmn0C4IgEA0BLQTuHG7Wa9WltV9lwulP1PTOtgmTYFoFnxJZdbMND+oppNgW7QkoR/oAwiAwGACiRE42T0her81RmKC01ESyphBOOIN6q53b1x6UU2baterZa76nssXHTUNGwRAIDkEEiVwaYc/ow5NrlBK5DNcah+jsjktbt3mXH9zPT46dmhxS1A3fYLn5iMGARAwn0CiBO7W9vrfqENCR64PqWnYwQjQrMZ3bapRqyTqe9JqOb7+BaOCUiAAAqYRSNSBS8InUfuOjLuBkl1Lj4jOnOrhyFFe0KzG+17QaV/fowJH7YdtIGAyAfiePALegSwpXduplh9X+2Ln115V0xO2jRA4lVGjVrbVNGwQAAEQMIVA4gSuC74nJBzvp+wyCRTZp0o3AxVEIRAAARDQnEB8AhcnCMG+rDTHT5woavIGDq7/HXuCPdpjJ6737ORYh81D3y8J5HAnZXIGFz0BAYVAIgWuXiu/U+kja6YtPW5x50x/gVPA1auVs0oyMeZh4/qiemcoXXPU7VptYlijIyAwSQKJFDgJlA5gyp1yYkHmxR3kzIAOnl6znDPvB1q9TI0MOj35fxq5o7oSuu3QEnqlqBAEQEArAokVuL3Z1ntV0na+uKOmo7Zz+dIBp0Vtp1Etn1TT2tmCvd71iS5iJvp9nv2PCmRyZ+66fUcMAiCQDAKJFbiD/7/8L4yz294wcW7PnHjjqpeO3BAZtwmaTbJ63xs03G26xlzwL+rqWxh+3b/96qxaz/zc3Lyahh0tAfkPIJ3hEN3gUNzqhiZtO8wVSvt2obRrF9ZuLxfWbtiF0lftfOkFO//U6D9qHG1XULvGBBIrcJJ5fbOs3DDB2HzauSjzER5OoO44f/TwUmaXaNHi9oAm23xu+dy+m0YcHQESqzucswznnHHeDpwWqxtSnLM0Z2yGPFhiTCwLJl5H9g8wzp7l3HmebHxAIBCBRAtcm4Bgf9mO2yuRyp1aw49etln4V6dPn/bPYLYr3m/s+UsmJ3Vn+1Ja7c3MTMabdav5sP0EcvminHG5s6+RY6ptkcJYH8FEEn7VYqy+Y6fRCYQgcKM3Guce9Vr5GSGEd8MJF+KX4mzflLbqdy3fb+qZ4vdx/XRocevgtLh2mHEq++RV+dM8xxUG2n9kMQl7H5p9CcIkP4xWYwWVLf1tMgry49Cq1QmsSdeA5Wy6QQ3QZQZ+nTH+H5yJ381mdn+bYQGBgAQSL3CSQ6NW8f2nTn+kcbzdhP5GZevtoNrtDN1WVmbp93XzKQ5/+m82odOUe+O22y9i9D0TMiwtzJ61aCFBkB86ZnNjw7hsBu1HfxQ36W+TU7AopCikO6GcaVTLc3Td2q5vrj9ar66fpfBjO9XKZ27cuIEZ3CCYyBtIYCoErtvzzW4so3NyFXFwlPpVW8nWxxScvXUS3ky6zXu3LstrPZ4bs7Mzs+nsGZo1eFmBDJopOaRh8jqSJ2KBdjS0EM20hENzrgDBcRzRchzWpHDoCLbvCE4ixV8iEVsxtPtw2xACUyNw9N/gY+qY0H/Wd9R0+Danf1DdWlXbzdMr5ozlex7xaz07+ZagRe3lwvxcoPdvZnJnb0pho++SaKuaWskAm5ppf+iAH1QcNCxH3mf4CZppWbtblSAhReXSu1vlDIWZ3Vp5bre2iGyoyAAABrZJREFUvlCvrv/8AETIAoFQCUyNwElqwhGflHE3LC6dOhfdc2m8d92PqXa3cQ0j0riOV3Twmapbse/v7dGMotN3uT5KrBZPnD90RY2E8NFBZUkCRCc4zp17+9fonysuQ6NWkafigoiCxmU2Uo0b65o8IylHCwEEhhOYKoFrbFU+LgRrujhSYqbm2hHEygyOqXYETR2vSju/dlWpQWtfFT9DM+Wru/b29n3X3uSsbFBIp1PpQaImnZHTMylku97MZiPV2r06Vf8sSA4IIKALgakSOAm9USv7bgW3C2t/LfOnOZCieaJPB2ntrxdGMVb79av+xyQCNkK8RIsWKWwNmqEF3A3FQAAEYiBwlMDF0PzEmlBuIhAfCNuLXKH4Bc74nFsvXYE7cG0tYy52PL94b4br5U2JIcUqaFcdWlxR63+eLmgdKAcCIBAtgakUODowqW844XZh9WPhYH46bRdKt0jc3q3Wl8pk1tS0drZgqgAL7fyLyaG9/X3vWtzhYfOQvifta2eD4t2tjVRMbqEZEACBMQlMpcC1WXEmHyRtm4xZf9g1RopyhdLb7VPFj9r50j/kCsXX7EJN/s7YI0oljTmWevLWaxduKHn6mYJ7MzguuO9a1NjOGrjjQf3aoitm/Y8PGNgduAwCU09gagVOONavKKOfXs6P9qOodqH4Cmfsa0zwP2Gc/Sxn/HGlPmn+Nx0s7Wr1W9rfcj9vpZ4jh+XMTdRrZVWgKRsfEAABEDCTwNQKXKN28UXGuPcKL8E5pVmgJUczN8b40+zBRQgm9kj0XiBx+/4HN+uZU61euEj+WjLo6SG8mjIC6C4IhEJgagVO0iMxeknG3bCQO332DV376Eiwn1AKXGOC/SPn7P1SIBrVyny9tv4RZTtMEAABEACBCRCYaoFrVMvvI+by1BxFjPGDua+zAAuJ2Y+7xSzGP0yn9X5uZ7P8d24eYhAAARAAgQkRUJq1FHtazQtexzlbZg9ZHsmffxMVeTsF+anerq6/LA0EEAABEAABvQhMvcDRacW3qENiF0rqS5nVTW27xdLvaRtyxdnnZYQAAiAAAiCgH4GpF7jOkIitTtxeF9rrISvOhfeMmxDin4YUS3A2ugYCIAACZhCAwNE41bOH76DI+9iF4sBb+5cfK34PFXJPT369Ua18jdL4gAAIgAAIaEgAAicH5cqVq4wJ7y0WjPEzbNDisPcwd+H8n10TMQiAQDACKAUCcRKAwHVpC87/tGu2I5rF/U/bUFaCMU/gWozh5hKGBQRAAAT0JQCB645NY7P8PGO9B7/JfooNWUjoXr6zuV4eshnZIAACIAACoRMYvUIInMJMMOezStLK5UtfVtKsxa3foJneb4qW86yaDxsEQAAEQEA/AhA4ZUwa1cqHuXItjnP2g8pmJmdtjc31z+5ub1xW82GDAAiAAAjoRwAC1zcmwrE+oWQ9MItTtiXNRH9AAARAIFEEIHB9w1nfWv8UZ2zXze6fxbn5iEEABEAABPQmAIEbMD6OYM8o2ZadL35JScMEARDoJ4A0CGhIAAI3YFAatfLfU/ZNCp0P5z/UMbAGARAAARAwhQAEbshIpQ6dn1I2WXah+IqShgkCIAACIBAOgchqgcANQXvr1sZXBBPf6W3mP9KzYYEACIAACOhOAAJ3xAg1qgvyp3HcElbu1Nrn3ARiEAABEAABvQlA4I4cn29s0+YrFNofLsR724ZhK7gLAiAAAtNIAAL3kFGvZw/kw96iW2zBzpde6NqIQAAEQAAENCYAgXvY4Fy5ssU431CK/apiwwSBhBNA90DAXAIQuABj56RaH/CKcWbTLO7XvDQMEAABEAABLQlA4AIMy+5rG1+lYhcpdD6cPdcxsAYBEAABEBhGYNL5ELiAI+CknZ+hok0K8vPEcqH4O9JAAAEQAAEQ0JMABC7guNAs7jJn/N/c4oLxj7k2YhAAARAAAf0IQOBGGJNZlvplKr5PQX7ydqH03PKp1SdkYiIBjYIACIAACAwlAIEbiubBDdXqhRoT7F+VLX8shHU9W3jqJ5U8mCAAAiAAAhoQgMCNOAj1WvkXaJd7FLwPF+3rc14aBggYQAAugkDiCUDgRh/iZovz72NMfFEI8RdcsGcty/nE6NVgDxAAARAAgSgJQODGoHtnc71cr1be1ahVPrRTK396Z3Pjf8eoBruAAAiAgJkEDPEaAmfIQMFNEAABEACB0QhA4EbjhdIgAAIgAAKGEIDAaTlQcAoEQAAEQOC4BCBwxyWI/UEABEAABLQkAIHTcljgFAiMTwB7ggAIdAh8FwAA//9RRJVuAAAABklEQVQDAJ8DzJGxQB9VAAAAAElFTkSuQmCC', 'Completed', '::1', 'SHA256-CERTIFIED-ELECTRONIC-RECORD', NULL, '2026-09-04 16:23:26', '2026-09-04 06:20:13', '2026-09-04 10:53:26'),
(21, 26, 'BEX-DOC-2026-0026-D0Z7KLHR-M4X0U23OHEQUFE5P658Q8Q', 'BEX-DOC', 2026, 26, 'D0Z7KLHR-M4X0U23OHEQUFE5P658Q8Q', 'Vimal Chavda', 'vimal@bexcodeservices.com', 'font-signature-2', 'data:image/png;base64,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', 'Completed', '::1', 'SHA256-CERTIFIED-ELECTRONIC-RECORD', NULL, '2026-09-04 14:21:13', '2026-09-04 08:49:33', '2026-09-04 08:51:13');

-- --------------------------------------------------------

--
-- Table structure for table `document_recipients`
--

CREATE TABLE `document_recipients` (
  `id` int(11) NOT NULL,
  `document_id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL,
  `email` varchar(255) NOT NULL,
  `role` enum('signer','approver','viewer','cc','reviewer') DEFAULT 'signer',
  `signing_order_index` int(11) DEFAULT 1,
  `status` enum('pending','sent','viewed','signed','declined') DEFAULT 'pending',
  `secure_token` varchar(255) DEFAULT NULL,
  `otp_code` varchar(10) DEFAULT NULL,
  `signed_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `document_recipients`
--

INSERT INTO `document_recipients` (`id`, `document_id`, `name`, `email`, `role`, `signing_order_index`, `status`, `secure_token`, `otp_code`, `signed_at`) VALUES
(1, 1, 'Vimal Chavda', 'vimal@bexcodeservices.com', 'signer', 1, 'pending', 'token_phpmyadmin_999', NULL, NULL),
(3, 6, 'Vimal Chavda', 'vimal@bexcodeservices.com', 'signer', 1, 'pending', 'token_phpmyadmin_1787841435301', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `document_validity`
--

CREATE TABLE `document_validity` (
  `id` int(11) NOT NULL,
  `document_id` int(11) NOT NULL,
  `certificate_id` varchar(100) NOT NULL,
  `hash_signature` varchar(255) NOT NULL,
  `is_valid` tinyint(1) DEFAULT 1,
  `checked_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `document_versions`
--

CREATE TABLE `document_versions` (
  `id` int(11) NOT NULL,
  `document_id` int(11) NOT NULL,
  `version_number` int(11) DEFAULT 1,
  `file_path` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `version_label` varchar(20) DEFAULT '1.0',
  `created_by` varchar(150) DEFAULT 'Manu Yadav',
  `details` text DEFAULT NULL,
  `action_type` varchar(50) DEFAULT 'Completed'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `document_versions`
--

INSERT INTO `document_versions` (`id`, `document_id`, `version_number`, `file_path`, `created_at`, `version_label`, `created_by`, `details`, `action_type`) VALUES
(1, 20, 1, '/uploads/sample.pdf', '2026-09-02 19:55:31', '1.0', 'Manu Yadav', 'Physically signed this document and uploaded a copy', 'Completed');

-- --------------------------------------------------------

--
-- Table structure for table `emails`
--

CREATE TABLE `emails` (
  `id` int(11) NOT NULL,
  `recipient_email` varchar(255) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `body` text NOT NULL,
  `sent_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `email_logs`
--

CREATE TABLE `email_logs` (
  `id` int(11) NOT NULL,
  `recipient_email` varchar(255) NOT NULL,
  `email_type` varchar(100) NOT NULL,
  `status` enum('success','failed') NOT NULL,
  `error_message` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `email_queue`
--

CREATE TABLE `email_queue` (
  `id` int(11) NOT NULL,
  `recipient_email` varchar(255) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `body` text NOT NULL,
  `status` enum('pending','processing','sent','failed') DEFAULT 'pending',
  `attempts` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `email_templates`
--

CREATE TABLE `email_templates` (
  `id` int(11) NOT NULL,
  `template_key` varchar(100) NOT NULL,
  `subject_line` varchar(255) NOT NULL,
  `html_body` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `employee_signatures`
--

CREATE TABLE `employee_signatures` (
  `id` int(11) NOT NULL,
  `employee_id` varchar(50) NOT NULL,
  `employee_name` varchar(150) NOT NULL,
  `employee_email` varchar(255) NOT NULL,
  `designation` varchar(100) DEFAULT 'Software Specialist',
  `department` varchar(100) DEFAULT 'Engineering',
  `initials` varchar(10) DEFAULT 'VC',
  `signature_id` varchar(100) NOT NULL,
  `signature_image` longtext DEFAULT NULL,
  `signature_style` varchar(50) DEFAULT 'font-signature-1',
  `status` enum('Active','Inactive','Revoked') DEFAULT 'Active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `employee_signatures`
--

INSERT INTO `employee_signatures` (`id`, `employee_id`, `employee_name`, `employee_email`, `designation`, `department`, `initials`, `signature_id`, `signature_image`, `signature_style`, `status`, `created_at`, `updated_at`) VALUES
(1, 'EMP001', 'Vimal Chavda', 'vimal@bexcodeservices.com', 'Software Specialist', 'Engineering', 'VC', 'BEX-SIGN-VC-EMP001-2026-361682B4', 'data:image/png;base64,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', 'font-signature-2', 'Active', '2026-09-01 19:43:38', '2026-09-04 10:53:26'),
(2, 'EMP002', 'Manu Yadav', 'manu.yadav@oladigital.health', 'Operations Director', 'Operations', 'MY', 'BEX-SIGN-MY-EMP002-2026-781920A1', NULL, 'font-signature-2', 'Active', '2026-09-01 19:43:38', '2026-09-01 19:43:38'),
(3, 'EMP003', 'Dhruv Patel', 'dhruv@bexcodeservices.com', 'Quality Lead', 'Quality Assurance', 'DP', 'BEX-SIGN-DP-EMP003-2026-928371C3', NULL, 'font-signature-1', 'Active', '2026-09-01 19:43:38', '2026-09-01 19:43:38');

-- --------------------------------------------------------

--
-- Table structure for table `failed_access_logs`
--

CREATE TABLE `failed_access_logs` (
  `id` int(11) NOT NULL,
  `ip_address` varchar(45) NOT NULL,
  `reason` varchar(255) NOT NULL,
  `attempt_time` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `integrations`
--

CREATE TABLE `integrations` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `provider` varchar(100) NOT NULL,
  `access_token` text DEFAULT NULL,
  `status` enum('connected','disconnected') DEFAULT 'connected',
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `type` varchar(50) DEFAULT 'info',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notification_preferences`
--

CREATE TABLE `notification_preferences` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `notify_doc_sent` tinyint(1) DEFAULT 1,
  `notify_doc_viewed` tinyint(1) DEFAULT 1,
  `notify_doc_signed` tinyint(1) DEFAULT 1,
  `notify_doc_completed` tinyint(1) DEFAULT 1,
  `notify_doc_declined` tinyint(1) DEFAULT 1,
  `notify_doc_expired` tinyint(1) DEFAULT 1,
  `notify_reminders` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `portals`
--

CREATE TABLE `portals` (
  `id` int(11) NOT NULL,
  `portal_name` varchar(150) NOT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `portal_users`
--

CREATE TABLE `portal_users` (
  `id` int(11) NOT NULL,
  `portal_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `reports`
--

CREATE TABLE `reports` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `report_type` varchar(100) NOT NULL,
  `report_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`report_data`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `scheduled_reports`
--

CREATE TABLE `scheduled_reports` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL,
  `frequency` enum('daily','weekly','monthly') DEFAULT 'weekly',
  `recipient_email` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `signatures`
--

CREATE TABLE `signatures` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `signature_name` varchar(100) DEFAULT 'My Signature',
  `signature_type` enum('draw','type','upload') DEFAULT 'draw',
  `signature_data` text NOT NULL,
  `is_default` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `signature_events`
--

CREATE TABLE `signature_events` (
  `id` int(11) NOT NULL,
  `document_id` int(11) NOT NULL,
  `recipient_id` int(11) DEFAULT NULL,
  `event_type` varchar(100) NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `signature_requests`
--

CREATE TABLE `signature_requests` (
  `id` int(11) NOT NULL,
  `document_id` int(11) NOT NULL,
  `recipient_id` int(11) NOT NULL,
  `token` varchar(255) NOT NULL,
  `status` enum('pending','opened','completed','expired') DEFAULT 'pending',
  `sent_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `templates`
--

CREATE TABLE `templates` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `file_path` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `template_fields`
--

CREATE TABLE `template_fields` (
  `id` int(11) NOT NULL,
  `template_id` int(11) NOT NULL,
  `role_name` varchar(100) NOT NULL,
  `field_type` varchar(50) NOT NULL,
  `pos_x` float NOT NULL,
  `pos_y` float NOT NULL,
  `is_required` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `template_roles`
--

CREATE TABLE `template_roles` (
  `id` int(11) NOT NULL,
  `template_id` int(11) NOT NULL,
  `role_name` varchar(100) NOT NULL,
  `signing_order_index` int(11) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `trash`
--

CREATE TABLE `trash` (
  `id` int(11) NOT NULL,
  `document_id` int(11) NOT NULL,
  `deleted_by` int(11) NOT NULL,
  `deleted_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `username` varchar(100) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `company` varchar(150) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `role` enum('super_admin','admin','manager','member') DEFAULT 'member',
  `is_verified` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `first_name`, `last_name`, `email`, `username`, `password_hash`, `company`, `phone`, `role`, `is_verified`, `created_at`, `updated_at`) VALUES
(1, 'Vimal', 'Chavda', 'vimal@bexcodeservices.com', NULL, '$2a$10$fGRxOZbEzsHrJnm4Xw07eOFY24noqWXVYGl3Tk.7A9qIMS8F8NUNC', NULL, NULL, 'member', 0, '2026-08-27 09:56:08', '2026-08-27 15:18:11'),
(2, 'Manu', 'Yadav', 'admin@bexsign.com', NULL, '$2a$10$fGRxOZbEzsHrJnm4Xw07eOFY24noqWXVYGl3Tk.7A9qIMS8F8NUNC', 'Dcode Health', NULL, 'admin', 1, '2026-08-27 15:11:32', '2026-08-27 15:18:11');

-- --------------------------------------------------------

--
-- Table structure for table `user_profiles`
--

CREATE TABLE `user_profiles` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `profile_image` varchar(255) DEFAULT NULL,
  `timezone` varchar(100) DEFAULT 'UTC',
  `language` varchar(20) DEFAULT 'en',
  `date_format` varchar(20) DEFAULT 'YYYY-MM-DD'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_sessions`
--

CREATE TABLE `user_sessions` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `token` varchar(500) NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `expires_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `webhooks`
--

CREATE TABLE `webhooks` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `url` varchar(500) NOT NULL,
  `events` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`events`)),
  `secret_token` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `activity_history`
--
ALTER TABLE `activity_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `document_id` (`document_id`);

--
-- Indexes for table `activity_logs`
--
ALTER TABLE `activity_logs`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `announcements`
--
ALTER TABLE `announcements`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `api_keys`
--
ALTER TABLE `api_keys`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `api_key` (`api_key`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `api_logs`
--
ALTER TABLE `api_logs`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `document_id` (`document_id`);

--
-- Indexes for table `contacts`
--
ALTER TABLE `contacts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `delegates`
--
ALTER TABLE `delegates`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `documents`
--
ALTER TABLE `documents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `document_fields`
--
ALTER TABLE `document_fields`
  ADD PRIMARY KEY (`id`),
  ADD KEY `document_id` (`document_id`);

--
-- Indexes for table `document_field_values`
--
ALTER TABLE `document_field_values`
  ADD PRIMARY KEY (`id`),
  ADD KEY `field_id` (`field_id`),
  ADD KEY `recipient_id` (`recipient_id`);

--
-- Indexes for table `document_files`
--
ALTER TABLE `document_files`
  ADD PRIMARY KEY (`id`),
  ADD KEY `document_id` (`document_id`);

--
-- Indexes for table `document_identifiers`
--
ALTER TABLE `document_identifiers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `bexsign_doc_id` (`bexsign_doc_id`),
  ADD KEY `idx_bexsign_doc_id` (`bexsign_doc_id`),
  ADD KEY `idx_document_id` (`document_id`);

--
-- Indexes for table `document_recipients`
--
ALTER TABLE `document_recipients`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `secure_token` (`secure_token`),
  ADD KEY `document_id` (`document_id`);

--
-- Indexes for table `document_validity`
--
ALTER TABLE `document_validity`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `certificate_id` (`certificate_id`),
  ADD KEY `document_id` (`document_id`);

--
-- Indexes for table `document_versions`
--
ALTER TABLE `document_versions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `document_id` (`document_id`);

--
-- Indexes for table `emails`
--
ALTER TABLE `emails`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `email_logs`
--
ALTER TABLE `email_logs`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `email_queue`
--
ALTER TABLE `email_queue`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `email_templates`
--
ALTER TABLE `email_templates`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `template_key` (`template_key`);

--
-- Indexes for table `employee_signatures`
--
ALTER TABLE `employee_signatures`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `employee_id` (`employee_id`),
  ADD UNIQUE KEY `signature_id` (`signature_id`),
  ADD KEY `idx_employee_id` (`employee_id`),
  ADD KEY `idx_signature_id` (`signature_id`);

--
-- Indexes for table `failed_access_logs`
--
ALTER TABLE `failed_access_logs`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `integrations`
--
ALTER TABLE `integrations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `notification_preferences`
--
ALTER TABLE `notification_preferences`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`);

--
-- Indexes for table `portals`
--
ALTER TABLE `portals`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `portal_users`
--
ALTER TABLE `portal_users`
  ADD PRIMARY KEY (`id`),
  ADD KEY `portal_id` (`portal_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `reports`
--
ALTER TABLE `reports`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `scheduled_reports`
--
ALTER TABLE `scheduled_reports`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `signatures`
--
ALTER TABLE `signatures`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `signature_events`
--
ALTER TABLE `signature_events`
  ADD PRIMARY KEY (`id`),
  ADD KEY `document_id` (`document_id`);

--
-- Indexes for table `signature_requests`
--
ALTER TABLE `signature_requests`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `token` (`token`),
  ADD KEY `document_id` (`document_id`),
  ADD KEY `recipient_id` (`recipient_id`);

--
-- Indexes for table `templates`
--
ALTER TABLE `templates`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `template_fields`
--
ALTER TABLE `template_fields`
  ADD PRIMARY KEY (`id`),
  ADD KEY `template_id` (`template_id`);

--
-- Indexes for table `template_roles`
--
ALTER TABLE `template_roles`
  ADD PRIMARY KEY (`id`),
  ADD KEY `template_id` (`template_id`);

--
-- Indexes for table `trash`
--
ALTER TABLE `trash`
  ADD PRIMARY KEY (`id`),
  ADD KEY `document_id` (`document_id`),
  ADD KEY `deleted_by` (`deleted_by`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `user_profiles`
--
ALTER TABLE `user_profiles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`);

--
-- Indexes for table `user_sessions`
--
ALTER TABLE `user_sessions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `webhooks`
--
ALTER TABLE `webhooks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `activity_history`
--
ALTER TABLE `activity_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=48;

--
-- AUTO_INCREMENT for table `activity_logs`
--
ALTER TABLE `activity_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `announcements`
--
ALTER TABLE `announcements`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `api_keys`
--
ALTER TABLE `api_keys`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `api_logs`
--
ALTER TABLE `api_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `contacts`
--
ALTER TABLE `contacts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `delegates`
--
ALTER TABLE `delegates`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `documents`
--
ALTER TABLE `documents`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

--
-- AUTO_INCREMENT for table `document_fields`
--
ALTER TABLE `document_fields`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `document_field_values`
--
ALTER TABLE `document_field_values`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `document_files`
--
ALTER TABLE `document_files`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `document_identifiers`
--
ALTER TABLE `document_identifiers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT for table `document_recipients`
--
ALTER TABLE `document_recipients`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `document_validity`
--
ALTER TABLE `document_validity`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `document_versions`
--
ALTER TABLE `document_versions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `emails`
--
ALTER TABLE `emails`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `email_logs`
--
ALTER TABLE `email_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `email_queue`
--
ALTER TABLE `email_queue`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `email_templates`
--
ALTER TABLE `email_templates`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `employee_signatures`
--
ALTER TABLE `employee_signatures`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `failed_access_logs`
--
ALTER TABLE `failed_access_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `integrations`
--
ALTER TABLE `integrations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notification_preferences`
--
ALTER TABLE `notification_preferences`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `portals`
--
ALTER TABLE `portals`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `portal_users`
--
ALTER TABLE `portal_users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `reports`
--
ALTER TABLE `reports`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `scheduled_reports`
--
ALTER TABLE `scheduled_reports`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `signatures`
--
ALTER TABLE `signatures`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `signature_events`
--
ALTER TABLE `signature_events`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `signature_requests`
--
ALTER TABLE `signature_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `templates`
--
ALTER TABLE `templates`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `template_fields`
--
ALTER TABLE `template_fields`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `template_roles`
--
ALTER TABLE `template_roles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `trash`
--
ALTER TABLE `trash`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `user_profiles`
--
ALTER TABLE `user_profiles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `user_sessions`
--
ALTER TABLE `user_sessions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `webhooks`
--
ALTER TABLE `webhooks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `activity_history`
--
ALTER TABLE `activity_history`
  ADD CONSTRAINT `activity_history_ibfk_1` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `api_keys`
--
ALTER TABLE `api_keys`
  ADD CONSTRAINT `api_keys_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `contacts`
--
ALTER TABLE `contacts`
  ADD CONSTRAINT `contacts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `delegates`
--
ALTER TABLE `delegates`
  ADD CONSTRAINT `delegates_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `documents`
--
ALTER TABLE `documents`
  ADD CONSTRAINT `documents_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `document_fields`
--
ALTER TABLE `document_fields`
  ADD CONSTRAINT `document_fields_ibfk_1` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `document_field_values`
--
ALTER TABLE `document_field_values`
  ADD CONSTRAINT `document_field_values_ibfk_1` FOREIGN KEY (`field_id`) REFERENCES `document_fields` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `document_field_values_ibfk_2` FOREIGN KEY (`recipient_id`) REFERENCES `document_recipients` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `document_files`
--
ALTER TABLE `document_files`
  ADD CONSTRAINT `document_files_ibfk_1` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `document_recipients`
--
ALTER TABLE `document_recipients`
  ADD CONSTRAINT `document_recipients_ibfk_1` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `document_validity`
--
ALTER TABLE `document_validity`
  ADD CONSTRAINT `document_validity_ibfk_1` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `document_versions`
--
ALTER TABLE `document_versions`
  ADD CONSTRAINT `document_versions_ibfk_1` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `integrations`
--
ALTER TABLE `integrations`
  ADD CONSTRAINT `integrations_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `notification_preferences`
--
ALTER TABLE `notification_preferences`
  ADD CONSTRAINT `notification_preferences_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `portal_users`
--
ALTER TABLE `portal_users`
  ADD CONSTRAINT `portal_users_ibfk_1` FOREIGN KEY (`portal_id`) REFERENCES `portals` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `portal_users_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `reports`
--
ALTER TABLE `reports`
  ADD CONSTRAINT `reports_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `scheduled_reports`
--
ALTER TABLE `scheduled_reports`
  ADD CONSTRAINT `scheduled_reports_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `signatures`
--
ALTER TABLE `signatures`
  ADD CONSTRAINT `signatures_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `signature_events`
--
ALTER TABLE `signature_events`
  ADD CONSTRAINT `signature_events_ibfk_1` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `signature_requests`
--
ALTER TABLE `signature_requests`
  ADD CONSTRAINT `signature_requests_ibfk_1` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `signature_requests_ibfk_2` FOREIGN KEY (`recipient_id`) REFERENCES `document_recipients` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `templates`
--
ALTER TABLE `templates`
  ADD CONSTRAINT `templates_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `template_fields`
--
ALTER TABLE `template_fields`
  ADD CONSTRAINT `template_fields_ibfk_1` FOREIGN KEY (`template_id`) REFERENCES `templates` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `template_roles`
--
ALTER TABLE `template_roles`
  ADD CONSTRAINT `template_roles_ibfk_1` FOREIGN KEY (`template_id`) REFERENCES `templates` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `trash`
--
ALTER TABLE `trash`
  ADD CONSTRAINT `trash_ibfk_1` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `trash_ibfk_2` FOREIGN KEY (`deleted_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `user_profiles`
--
ALTER TABLE `user_profiles`
  ADD CONSTRAINT `user_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `user_sessions`
--
ALTER TABLE `user_sessions`
  ADD CONSTRAINT `user_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `webhooks`
--
ALTER TABLE `webhooks`
  ADD CONSTRAINT `webhooks_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
