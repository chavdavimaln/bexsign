-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Sep 03, 2026 at 03:04 PM
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
(29, 20, 'Document ID 20 electronically signed by Vimal Chavda (vimal@bexcodeservices.com) and marked Completed', '::1', '2026-09-03 04:45:23');

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
(1, 1, 'PhpMyAdmin_Signature_Agreement_2026.pdf', NULL, 'General', 'Completed', 'parallel', 'vimal@bexcodeservices.com', NULL, NULL, 3, 30, NULL, '2026-08-27 15:26:30', '2026-08-27 09:56:29', '2026-08-27 09:56:30'),
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
(19, 1, 'Document 1.pdf', '/uploads/sample.pdf', 'None', 'Draft', 'sequential', 'vimal@bexcodeservices.com', NULL, NULL, 5, 15, NULL, NULL, '2026-09-02 19:55:15', '2026-09-02 19:55:19'),
(20, 1, 'vimal signature document.pdf', '/uploads/sample.pdf', 'None', 'Completed', 'sequential', 'vimal@bexcodeservices.com', NULL, NULL, 5, 15, NULL, NULL, '2026-09-02 19:55:31', '2026-09-03 04:36:48');

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
  `uploaded_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
(14, 19, 'BEX-DOC-2026-0019-ZSTV2BKJ-X718J699IGQH1W4UQL4458', 'BEX-DOC', 2026, 19, 'ZSTV2BKJ-X718J699IGQH1W4UQL4458', 'Vimal Chavda', 'vimal@bexcodeservices.com', 'font-signature-1', NULL, 'Draft', '223.181.69.208', 'SHA256-CERTIFIED-ELECTRONIC-RECORD', NULL, NULL, '2026-09-02 19:55:15', '2026-09-02 19:55:15'),
(15, 20, 'BEX-DOC-2026-0020-QL5KVYNA-KHT5B9WZQ55GSURCJFHX', 'BEX-DOC', 2026, 20, 'QL5KVYNA-KHT5B9WZQ55GSURCJFHX', 'Vimal Chavda', 'vimal@bexcodeservices.com', 'font-signature-1', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAbgAAACMCAYAAAAOVry8AAAQAElEQVR4AeydbWwkyVnHq3rGY3vXnvGu7RmHC3e53LJnj49LUARadFEuX9BdJFBIQgggBEFIERLHS5AiARKHTgIkJCQSSMSHSEnuwwEKEUQnEUL4AEHh5UQOEHc7s3svm012s9kZe3c9M157bc908Twz7nZ1+2Vnerpnqrv/LZe7qrur6qnfM13/ruqeHktgAQEQAAEQAIEEEoDAJdCpaBIIgAAIgIAQEDh8CoITQE4QAAEQMJgABM5g58A0EAABEACB4AQgcMHZIScIgEBwAsgJApETgMBFjhgVgAAIgAAIjIMABG4c1FEnCIAACIBAcAJ95oTA9QkKh4EACIAACMSLAAQuXv6CtSAAAiAAAn0SgMD1CSpdh6G1IAACIBB/AhC4+PsQLQABEAABEDiCAATuCCjYBAIgEJwAcoKAKQQgcKZ4AnaAAAiAAAiESgACFypOFAYCIAACIBCcQLg5IXDh8kRpIAACIAAChhCAwBniCJgBAiAAAiAQLgEIXLg8TS8N9oEACIBAaghA4FLjajQUBEAABNJFAAKXLn+jtSAQnABygkDMCEDgYuYwmAsCIAACINAfAQhcf5xifdTc0vJ7Y90AGA8CIBB3AmOxHwI3FuyjqzRfLH9eKeufeT26WlETCIAACIyfAARu/D6I1AIpxUcFLc6aovgDARAAgVQQgMAlxM1oBgiAAAiAgJcABM7LAykQAAEQAIGEEIDAJcSRaMZ4CeSLKzYFNVssr4/XkiC1Iw8IJJMABC6ZfkWrRkrgbe+UvUVYUsyPtGpUBgIgcCyBVAscXXHzVbd9LB3sCJXA7OKKzSHUQo0o7GrTCDNgBAiMgYDJVaZW4E4vPLrdu+iWslAqK5OdlATbSNh2LUtKDrOL5TtJaBPaEA6BmYVHO3SxqU4KheKK8oQSpem85XP3qEBl2bni+d8Px0KUElcCqRU4IayG7jQ+IfQ04uESkFJMOCValig4cazTS2B6vvxNFqdMJmNJKYWUxwfaKTxBSHHSImmZUtazJx2DfcknkFqBu7teXVK0OC6m80EaKXKOgfFf66NkWVhcbsW/SWhBUAKT86sv5rLiXUHz95NPKXuvn+NwTHIJpFbg2KXNetXTfha52cXlDu9DCJeAn7WScibcGlBaHAhMnX3s6zxqm8qqn/Dba9skSSGFTnvnWmv9tSl/HUini4Cng09X03utbdQqmV6s99+i5fTCyvVeCv+jIkAXE4JGzPqoLqqq0lyucW2fnLDf4zfKpoXOQ9laq1phhc1bbz7orwfp9BFIvcCRy+29tvgOrd2/bEY+QImTJ/npAPwNRwAiNxy/uOWmC5pDTywrWlprlzwXmXFrF+w1lwAEjnyzdavyEF1Eek4+mkbxpOkw/A1N4PCAbV/kwHpotmYXMLPwaJt87V40kq4pHrX5p67NbkXKrEtAcyFw+07kq0g+6faT3dVRV5zdHfg3NAGdtd7xDV3weAqAQJ/AfXLu/JUMLfohEDadBuJREYDAaWT5pPN3vBA5DdCwUW0Ap4R1Ty+OOOPhHh1IQuLs16nJ7MN6c3jkpqcRB4GoCEDgfGRZ5PRNPLqI5slKvZZ0xn0XE/gsJuxjQOJm0/nj8attd3AhkzA/m9wcz4fPZENHaVujNp3T67NomZpf/aq+DfHBCWgDOP6abmcme8rzVQHqEGPZ+eVyM6cGp5HsHHQPW5G4uffcuLUsbq21y1mOI4DAKAhA4I6k/PJeu9PZ1ndNZtVTehrxYQkodePGy1s0inMLog4xlp/H3d3NTbcRI4qYWg1/gZvFzW8fT0tC3PxUkI6aQCw7lKihcPl31y+fsm2lDzrEUScuH4sQnIDcyZ7Vc9Morq2nEY8PAfKd7f8CN13AdJ+WjE8rYGmSCEDgTvAmf+mUT1D9ED6J9TTiAQlI0X2NUqPxyh1i7BZCozh8J8qlEY8InxN88Ue+80xJkl9t/z3teLQo6Vamp30QuPv4mk9QOlHdo/gk5hPa3YDI0AQ6IrOkFwK+Og2z40cJG1tM5wyLGy5WGAbC2AhA4PpATyLnuTJlkZtZXPY85t5HMTjkGAJ366/WaDLYffky880Xy7vHHI7NhhBgcfObQsLWnZKkcwbi5oeD9MgJQOD6RL61a72gH5qxrEkhFg69MFYIoR821ni+VH5xrAYMUHmzXslz5+hkkVJMiHPniLGzxeD15KTnqVuDLQ3NNL+4se/4QZKm7wXmoVWIgkAgAAEIXJ/Q9u68+vOdTsfWDy+UimYLiBJP6/aaHvd3joVWLh6j5J2deNgZ0gdgZmHZ81uKLG5+34VUFYoBgaEIQOAGwLe5fjnDJ7Oexez7Rcr9zpHfbr0NRsWl+qZuD/GN5Xfj9DYMFDf44MnCytfIH3YmY+V1MyFuOg3ETSIAgRvQG3wy62IhaeGTfsBiRnI4mabdO5R3R1LpkJU0blZ/2MfXOvvA428dslhkH5IAv81nakr+mPczJYTd3sO90iHZInt0BCBwAdiyyOnZ+KTnDkDfZlp8d6r9jGk2HWePn2+n3b5m6kXEcW1I0nZiryxa/G2yac6+dev1eNwn9RufzDRa5SMAgfMB6TdJN9Q97Oj8t07Pr6z3mz/y43JvWdHruPed157X06bHla0+qdvIFxH+Bxv0/WOOe+7NjtmWUKsnceP3SXrKVLZt0+dfttbx2i0PGCSMI+DppI2zzmyD1KEfSs3KeTLZCKb5M2e+QbbE9q+5Vv24EuKKvwH5Yrn7BXH/dqRHQ+DetjrfxA+UjgY2ahmagBGd8dCtGFEB/mq2blUeootZz9U7jTLMeChCqTOOvfo9LWdbHNbNWuURHino9kspsoXF8u/Gwf642zhxZvV5SYvTDvbDTrP6upPGGgRMJwCBG9JDLbqa5RNfL4andfT0OOLUL+kPmJghugFB+O/JCUv8YcCikG0AAqdy6hf0w9tt+46eRhwETCcAgQvBQ9wB6yLH4mKCyLlNk+Irbjy2Ebmlm04j5Zi9wV+33vw48aUZ4gM7eaZi6/ZlnoI/2IgYCBhOAAIXkoNY5PSiWORMebKSpvrer9sWx3ijdvG0z25/2rcbyaAE/BdnLG48UxG0POQDgXERgMCFSJ7uF7lfrOZi+cnKUwur/81xhOEJSKX+VC/F3xHr+xAPRoAvyvjizMnNMxMQN4fG+NaoORgBCFwwbsfl6rQ7tmcqbSKjfui4g7F9MAIb9epvUYfr3k/kjriwVL46WCk4+iQCfFGm7/fPTOj7EAcB0wlA4EL20N31S6dt/FBqH1Rlu4+DDh1CHa5nlKxs9dChg7AhEIFDI+KOeleggpAJBAwhAIFjR4QcWmtVi0Yanpv0hzqPkOuMXXFKeb5eMaD97vfjaBRHWS94vtROG/A3IIHc2dUvEkv3yVublsZ6FdPrA3LE4WYRgMBF5A8aabDIuaVz5wGRc3EMFaF7nY/oBeSLjYqeHnV8cjIf+wdeprL2T+nccN9Np4F4XAlA4CL0HImce0XM1bDIzSws400cDGP44BnFFR4of3j4IgOVIHZ2mq1gOc3JxZ9NxxoavA0zunaKwRoExk4AAhexC7Z2rRf0KjIZKytOveM5fRvigxPwj+LUnvri4KUgBxPgJyd57QSM3hwSWMedAAQuYg8e+UOps3vPRlxtKoqXQrhTkzQCEfOL5d9JRcPRyOQQQEsiJQCBixRvr/DN9csZRUsv1fuP+3E9DsP836hVVvX8e1L9kZ5GHARAIN0EIHAj8j/dj+OHTtwnK2nEISFyw8OXSv6bUwoxFYVi+S+cNNYgAALpJpBwgTPLuSxyukXUIUv//Q99P+L3J7BRv/huz1FS/IonjQQIgEBqCUDgRuz6Rq1Ct44OKvW/OeJgD2L9EpBKfFloC43i/k5LIgoCIJBSAhC4MTje/0Op+eIKHssewg8b9coHPNml+EkRwtJ3EdPTE30fa+aB7tS5mebBKhAIRgACF4zbULn4h1IVLU4hPFV5eqF80UljPTgBaVuf0nPNFctf19ORxre3dyItP/LCaQwceR2oAARGTwACN3rm3Rr99+OyGVHu7kj2P32kGupvi22svfqbOjolxXv0NOIgMFoCqM0EAhC4MXqh07F39eqT/sCJFPINp71SitCn9ToZ9YxTPq/nSqv/y2uE+xLAFOV9EeGAOBKAwI3Ra5vrlyZpptLtXJL+wMmWEh+JEvfmjepn9PKVUO/Q0xHG9ZFphNWgaBAAgUEIxFXgBmmj0cc26zuel9wm+YGTvbWKZ0Q189ZzT4btnN3m7I/qZc6Vyjf0NOIgAALpIQCBG7uvr/ytPoqTtEzPP/YfYzdrBAZkdic/F3Y129sv/SfxdIul4fFbhHjv29wNiIAACKSGAATOAFf7HzjJZe0LBpgViQkkONp9R3U2ikosKV/Uyy2U6t/S0wIJLwEpyC3eTUiBQBIIQOAM8aL/J0qS+sCJVOrbLnIpZ914iJGNWuX9Som2XmShVL6jp0OOx/oeXEeIvw6ZB4oDASMIQOCMcIMQ/p8oSeoDJ0rKfzhArjIH8XBjzXrF/5Tm3NnSY5E+5BJuC0ZX2la9+ot6bbOLePGAzsMXRzJGBCBwBjlrryOu6OYk8YGTZq3yG3obo4zTzNvf6+V3hI2Rig5Ei9N9S3ea0qI5Xm0XoiAQWwIQOINct7VeeUTvaCQtUwur2ojHIGNjYMpGrfrjxJNm4A6MzZfK2wcpxBwCzV3xcSfOa5rSdQWP0wggEEcCxglcHCGGaXOzXvX4ZDKjng6zfNPKyhdXPx2lTcQzSyLnViGFmCoUy5fdDYj0CGxUP2Xbaq+X6P2fXVz2XBz0tuI/CMSHgKczjY/ZybaUOmTP1XPyOhrpdpxSSM/31qLwLImc9JQrxfm5xfKve7YNl4j1QyZO01tr1Zz+2eP7wPniyl1nP9YgEDcCEDgDPUYdsscv3NEYaGZgk5SwXYGj+Fbggg5lPH7DTm7b86VyZQnPy5mPz5muPf7PHs2Sn8oVzz+bLgpobVIIeDrSpDQqCe3wv6eSrqQTMUrY983I23Lv2rf+VSjx+n793RUxdYW2uwH/ugTuKftPupH9f9My+9x+FCsQiBUBCJyh7vK/p5KupOXE2dXPG2puLMxq1CvnlRLufSZiahVK5UYsjB+hkTv1S5+wlbilV0kXAyO/KNHrH0UcdSSPAATOYJ/631M5nbU/arC5sTCtWa/kfIbmC6WVf/FtS32yVa8s6Pfj6GJAzhZXYv67d6l3a+oAQOCMdvmh91QKGnF4HkAx2nxDjWvUKt6HToR8cmrq3W831NyxmdX0PdFrSZnjkZy1+AMj+y7j2BqPihNBYHQClwhco2+Ev5NhC1jkJs6s/hXHEYIRaCtrSc85Wbj9pp5GvEfAfzHQHclZE59koesdgf8gYC4By1zTYJlDwN/J8PZTOfUzM4vL9zget0DDp4NRqFQjeYrSz+hu/dUabXuJgvtHFw62m0DEJWArdehlpo3inwAAB+ZJREFU1Sx0xEux0M0uYYrXhYWIUQQgcEa543hjWOT0eyJ8ZMayJrmD4Xisgv6gh5L9CFwkzSOmF0hp9ftKkjvtueLKYF8+n5nx39eLxN5xFdqqV99OrKStxG2/DSx0lpJPMrd8sew+wOM/DmkQGAcBCNw4qAesk6cr/SLHHcz9RG520bSX50pjRkrNWmVKaYLLrlFS/upcqXzwqwe88aQgD764ftJhcd/Xqlfme0KnjnzdmZQi2xO6FXt2sbw7W1zZnllaxnfo4u74GNsPgYuZ81jkOh3bc6UsafGLnC6EliVpVtCchiqp3J+ykUJ9d9yWNeuVnFDqNd0OGtk9yJ11Yam8UyitnvyS5lYmVd+na9Wrp1jo6DN2ZLslLZYlJuhjN5VR1nOFUllx4M9ofqlcEaNeUF9qCUDgYuj6zfVLua098QWhLdSndKfXnE1N3xNwznYT1qS2mybYodvQqFcfJVE7/HSgEjT9qD6SL5Wr+vHe+ETbm05Hij5jWRa6vWzn90jsCN/J7ebPqFRihcWOAwleh6Y1N/PF1W+cnBN7QSAYAQhcMG5jz7V3u/JL3Ln4DeGOY3r+/AP+7UjfnwBNV/4ZM/VPWXJOEuXlQmnl/zh+OKylUuAcDlvfvfwHJHYWs7OFushiR8HZfeyaBI8GeeK0lOoJ/tw6gYTPptCm0R5ein0sPezoh0AIAtdPNTgmKgLcqVBn4rl6zmWz1/Ol1Z+Nqs6kl9ukKUvm2qhN50jYvnfQXvmD1Akf9aXwVAvcAR8hWrXqY02aPaAgewz5O4fqs/QZPXI6U8/rxEn4+C9Do73zxLs7vems88XyXqFY/opzLNYgcBIBCNxJdGKyjzoTizoQj8jRva2/jIn5Bpv58t5GrfJ9ZOBVCs4fPzH4gpPgdb5Uxhv3GcQxoVGrfow+o93pzEat0hU+GiVv+j+zx2T3bJZSZIUU73MEj9f54gp/XeGo0KH9N+cXV5/xFIJEaghA4BLiaupALNvu9H2VbEqzlZBPmGLLcXZQp/ywEuqGtv/nqON0H5agUR7dp9P2InpfAs16ZbZJIz1i2xW87np2t0DidY2Er0NB3beQ/QOklELKIwP3b6W2pf6c/OWOBEkQeQqUA90DXGlT2hfKe3TRsk15GoWl8q25pfK3KVwtLK1WC0vlLxWKqx/arxorwwnwB8BwE2FevwRaa5ezO235tX6PH9txSvyPW7cU78wXl59y04ZGmrUq39fU33ayMldc/qCh5sbTrDfeaDZuVh4k4ctS6N7T6wofjfqEUK/QqC+UqWB5sNA9QJmhpC+IrBRiiiDmhRJnqd4HKTwklFqm9IeEVF+aXVg+T/vxZzgBCJzhDhrUvHu3Lj7FncKg+UZ5fKNe/SB1FNedOi1L6F+2djYbtyau56ijdacrlbQ+4TeSjqG+0b8V6WEJNGrVx5v1ykSDxM4JQog3SXg2aKh3yx+EFLdpXyiCeITt9cLU5rUjtmOTYQQgcIY5JCxzuBOwbaU4cDysckMrR6o3QitrlAUp8TGtugs0ZfVhLY3oCAnQ5/ocid6ZZq2y4A80EpynfR5BpCuPT+9fWNFFirwihHydtr3iDySO/0XHfZW2f5nC56SSn+FAw73fzlj2043prYeuX79+5JfdBRajCEDgjHJHuMa01qoWh3BLDac0mhZ6nkriVz+9tHHz0lFPJtJu8/5o9PlPdD/u313LlPisG0fEaAIbtcqvNeqV7ydhfLhRu/gIhfMbtcrj/kDi+CN03Pto+wco/PJG/eIzHO7cvPjHt7936R/F1auxfAes0c6JyLiTBC6iKlEsCAixcbPyBepo+NVPF+LGo1mrPkFX+H+zb3dhf40VCICAYQQgcIY5BObEg0CjXvlpEmiawTqwV9FykEIMBEBg3AQgcOP2QFLrT2G7mvUqzqcU+h1NNpcATkhzfQPLQAAEQAAEhiAAgRsCHrKCgBKq+8CBswaRUAigEBAIhQAELhSMKCStBJq16jTfi+N1Whmg3SBgKgEInKmegV0gAAIgAAKDE9ByQOA0GIiCAAiAAAgkhwAELjm+REtAAARAAAQ0AhA4DQai/RDAMSAAAiAQDwIQuHj4CVaCAAiAAAgMSAACNyAwHA4CIBCcAHKCwCgJQOBGSRt1gQAIgAAIjIwABG5kqFERCIAACIBAcAKD54TADc4MOUAABEAABGJAAAIXAyfBRBAAARAAgcEJQOAGZ5bUHGgXCIAACCSKAAQuUe5EY0AABEAABBwCEDiHBNYgAALBCSAnCBhIAAJnoFNgEgiAAAiAwPAEIHDDM0QJIAACIAACwQlElhMCFxlaFAwCIAACIDBOAhC4cdJH3SAAAiAAApERgMBFhtacgmEJCIAACKSRAAQujV5Hm0EABEAgBQQgcClwMpoIAsEJICcIxJcABC6+voPlIAACIAACJxCAwJ0AB7tAAARAAASCExh3TgjcuD2A+kEABEAABCIhAIGLBCsKBQEQAAEQGDcBCNy4PTBM/cgLAiAAAiBwLAEI3LFosAMEQAAEQCDOBCBwcfYebAeB4ASQEwQSTwACl3gXo4EgAAIgkE4CELh0+h2tBgEQAIHgBGKSEwIXE0fBTBAAARAAgcEIQOAG44WjQQAEQAAEYkIAAmeko2AUCIAACIDAsAQgcMMSRH4QAAEQAAEjCUDgjHQLjAKB4ASQEwRAoEfg/wEAAP///lsnxAAAAAZJREFUAwC4Lh6Ci4C7IgAAAABJRU5ErkJggg==', 'Completed', '::1', 'SHA256-CERTIFIED-ELECTRONIC-RECORD', NULL, '2026-09-03 10:15:19', '2026-09-02 19:55:31', '2026-09-03 04:45:19');

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
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
(1, 'EMP001', 'Vimal Chavda', 'vimal@bexcodeservices.com', 'Software Specialist', 'Engineering', 'VC', 'BEX-SIGN-VC-EMP001-2026-361682B4', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAbgAAACMCAYAAAAOVry8AAAQAElEQVR4AeydbWwkyVnHq3rGY3vXnvGu7RmHC3e53LJnj49LUARadFEuX9BdJFBIQgggBEFIERLHS5AiARKHTgIkJCQSSMSHSEnuwwEKEUQnEUL4AEHh5UQOEHc7s3svm012s9kZe3c9M157bc908Twz7nZ1+2Vnerpnqrv/LZe7qrur6qnfM13/ruqeHktgAQEQAAEQAIEEEoDAJdCpaBIIgAAIgIAQEDh8CoITQE4QAAEQMJgABM5g58A0EAABEACB4AQgcMHZIScIgEBwAsgJApETgMBFjhgVgAAIgAAIjIMABG4c1FEnCIAACIBAcAJ95oTA9QkKh4EACIAACMSLAAQuXv6CtSAAAiAAAn0SgMD1CSpdh6G1IAACIBB/AhC4+PsQLQABEAABEDiCAATuCCjYBAIgEJwAcoKAKQQgcKZ4AnaAAAiAAAiESgACFypOFAYCIAACIBCcQLg5IXDh8kRpIAACIAAChhCAwBniCJgBAiAAAiAQLgEIXLg8TS8N9oEACIBAaghA4FLjajQUBEAABNJFAAKXLn+jtSAQnABygkDMCEDgYuYwmAsCIAACINAfAQhcf5xifdTc0vJ7Y90AGA8CIBB3AmOxHwI3FuyjqzRfLH9eKeufeT26WlETCIAACIyfAARu/D6I1AIpxUcFLc6aovgDARAAgVQQgMAlxM1oBgiAAAiAgJcABM7LAykQAAEQAIGEEIDAJcSRaMZ4CeSLKzYFNVssr4/XkiC1Iw8IJJMABC6ZfkWrRkrgbe+UvUVYUsyPtGpUBgIgcCyBVAscXXHzVbd9LB3sCJXA7OKKzSHUQo0o7GrTCDNgBAiMgYDJVaZW4E4vPLrdu+iWslAqK5OdlATbSNh2LUtKDrOL5TtJaBPaEA6BmYVHO3SxqU4KheKK8oQSpem85XP3qEBl2bni+d8Px0KUElcCqRU4IayG7jQ+IfQ04uESkFJMOCValig4cazTS2B6vvxNFqdMJmNJKYWUxwfaKTxBSHHSImmZUtazJx2DfcknkFqBu7teXVK0OC6m80EaKXKOgfFf66NkWVhcbsW/SWhBUAKT86sv5rLiXUHz95NPKXuvn+NwTHIJpFbg2KXNetXTfha52cXlDu9DCJeAn7WScibcGlBaHAhMnX3s6zxqm8qqn/Dba9skSSGFTnvnWmv9tSl/HUini4Cng09X03utbdQqmV6s99+i5fTCyvVeCv+jIkAXE4JGzPqoLqqq0lyucW2fnLDf4zfKpoXOQ9laq1phhc1bbz7orwfp9BFIvcCRy+29tvgOrd2/bEY+QImTJ/npAPwNRwAiNxy/uOWmC5pDTywrWlprlzwXmXFrF+w1lwAEjnyzdavyEF1Eek4+mkbxpOkw/A1N4PCAbV/kwHpotmYXMLPwaJt87V40kq4pHrX5p67NbkXKrEtAcyFw+07kq0g+6faT3dVRV5zdHfg3NAGdtd7xDV3weAqAQJ/AfXLu/JUMLfohEDadBuJREYDAaWT5pPN3vBA5DdCwUW0Ap4R1Ty+OOOPhHh1IQuLs16nJ7MN6c3jkpqcRB4GoCEDgfGRZ5PRNPLqI5slKvZZ0xn0XE/gsJuxjQOJm0/nj8attd3AhkzA/m9wcz4fPZENHaVujNp3T67NomZpf/aq+DfHBCWgDOP6abmcme8rzVQHqEGPZ+eVyM6cGp5HsHHQPW5G4uffcuLUsbq21y1mOI4DAKAhA4I6k/PJeu9PZ1ndNZtVTehrxYQkodePGy1s0inMLog4xlp/H3d3NTbcRI4qYWg1/gZvFzW8fT0tC3PxUkI6aQCw7lKihcPl31y+fsm2lDzrEUScuH4sQnIDcyZ7Vc9Morq2nEY8PAfKd7f8CN13AdJ+WjE8rYGmSCEDgTvAmf+mUT1D9ED6J9TTiAQlI0X2NUqPxyh1i7BZCozh8J8qlEY8InxN88Ue+80xJkl9t/z3teLQo6Vamp30QuPv4mk9QOlHdo/gk5hPa3YDI0AQ6IrOkFwK+Og2z40cJG1tM5wyLGy5WGAbC2AhA4PpATyLnuTJlkZtZXPY85t5HMTjkGAJ366/WaDLYffky880Xy7vHHI7NhhBgcfObQsLWnZKkcwbi5oeD9MgJQOD6RL61a72gH5qxrEkhFg69MFYIoR821ni+VH5xrAYMUHmzXslz5+hkkVJMiHPniLGzxeD15KTnqVuDLQ3NNL+4se/4QZKm7wXmoVWIgkAgAAEIXJ/Q9u68+vOdTsfWDy+UimYLiBJP6/aaHvd3joVWLh6j5J2deNgZ0gdgZmHZ81uKLG5+34VUFYoBgaEIQOAGwLe5fjnDJ7Oexez7Rcr9zpHfbr0NRsWl+qZuD/GN5Xfj9DYMFDf44MnCytfIH3YmY+V1MyFuOg3ETSIAgRvQG3wy62IhaeGTfsBiRnI4mabdO5R3R1LpkJU0blZ/2MfXOvvA428dslhkH5IAv81nakr+mPczJYTd3sO90iHZInt0BCBwAdiyyOnZ+KTnDkDfZlp8d6r9jGk2HWePn2+n3b5m6kXEcW1I0nZiryxa/G2yac6+dev1eNwn9RufzDRa5SMAgfMB6TdJN9Q97Oj8t07Pr6z3mz/y43JvWdHruPed157X06bHla0+qdvIFxH+Bxv0/WOOe+7NjtmWUKsnceP3SXrKVLZt0+dfttbx2i0PGCSMI+DppI2zzmyD1KEfSs3KeTLZCKb5M2e+QbbE9q+5Vv24EuKKvwH5Yrn7BXH/dqRHQ+DetjrfxA+UjgY2ahmagBGd8dCtGFEB/mq2blUeootZz9U7jTLMeChCqTOOvfo9LWdbHNbNWuURHino9kspsoXF8u/Gwf642zhxZvV5SYvTDvbDTrP6upPGGgRMJwCBG9JDLbqa5RNfL4andfT0OOLUL+kPmJghugFB+O/JCUv8YcCikG0AAqdy6hf0w9tt+46eRhwETCcAgQvBQ9wB6yLH4mKCyLlNk+Irbjy2Ebmlm04j5Zi9wV+33vw48aUZ4gM7eaZi6/ZlnoI/2IgYCBhOAAIXkoNY5PSiWORMebKSpvrer9sWx3ijdvG0z25/2rcbyaAE/BdnLG48UxG0POQDgXERgMCFSJ7uF7lfrOZi+cnKUwur/81xhOEJSKX+VC/F3xHr+xAPRoAvyvjizMnNMxMQN4fG+NaoORgBCFwwbsfl6rQ7tmcqbSKjfui4g7F9MAIb9epvUYfr3k/kjriwVL46WCk4+iQCfFGm7/fPTOj7EAcB0wlA4EL20N31S6dt/FBqH1Rlu4+DDh1CHa5nlKxs9dChg7AhEIFDI+KOeleggpAJBAwhAIFjR4QcWmtVi0Yanpv0hzqPkOuMXXFKeb5eMaD97vfjaBRHWS94vtROG/A3IIHc2dUvEkv3yVublsZ6FdPrA3LE4WYRgMBF5A8aabDIuaVz5wGRc3EMFaF7nY/oBeSLjYqeHnV8cjIf+wdeprL2T+nccN9Np4F4XAlA4CL0HImce0XM1bDIzSws400cDGP44BnFFR4of3j4IgOVIHZ2mq1gOc3JxZ9NxxoavA0zunaKwRoExk4AAhexC7Z2rRf0KjIZKytOveM5fRvigxPwj+LUnvri4KUgBxPgJyd57QSM3hwSWMedAAQuYg8e+UOps3vPRlxtKoqXQrhTkzQCEfOL5d9JRcPRyOQQQEsiJQCBixRvr/DN9csZRUsv1fuP+3E9DsP836hVVvX8e1L9kZ5GHARAIN0EIHAj8j/dj+OHTtwnK2nEISFyw8OXSv6bUwoxFYVi+S+cNNYgAALpJpBwgTPLuSxyukXUIUv//Q99P+L3J7BRv/huz1FS/IonjQQIgEBqCUDgRuz6Rq1Ct44OKvW/OeJgD2L9EpBKfFloC43i/k5LIgoCIJBSAhC4MTje/0Op+eIKHssewg8b9coHPNml+EkRwtJ3EdPTE30fa+aB7tS5mebBKhAIRgACF4zbULn4h1IVLU4hPFV5eqF80UljPTgBaVuf0nPNFctf19ORxre3dyItP/LCaQwceR2oAARGTwACN3rm3Rr99+OyGVHu7kj2P32kGupvi22svfqbOjolxXv0NOIgMFoCqM0EAhC4MXqh07F39eqT/sCJFPINp71SitCn9ToZ9YxTPq/nSqv/y2uE+xLAFOV9EeGAOBKAwI3Ra5vrlyZpptLtXJL+wMmWEh+JEvfmjepn9PKVUO/Q0xHG9ZFphNWgaBAAgUEIxFXgBmmj0cc26zuel9wm+YGTvbWKZ0Q189ZzT4btnN3m7I/qZc6Vyjf0NOIgAALpIQCBG7uvr/ytPoqTtEzPP/YfYzdrBAZkdic/F3Y129sv/SfxdIul4fFbhHjv29wNiIAACKSGAATOAFf7HzjJZe0LBpgViQkkONp9R3U2ikosKV/Uyy2U6t/S0wIJLwEpyC3eTUiBQBIIQOAM8aL/J0qS+sCJVOrbLnIpZ914iJGNWuX9Som2XmShVL6jp0OOx/oeXEeIvw6ZB4oDASMIQOCMcIMQ/p8oSeoDJ0rKfzhArjIH8XBjzXrF/5Tm3NnSY5E+5BJuC0ZX2la9+ot6bbOLePGAzsMXRzJGBCBwBjlrryOu6OYk8YGTZq3yG3obo4zTzNvf6+V3hI2Rig5Ei9N9S3ea0qI5Xm0XoiAQWwIQOINct7VeeUTvaCQtUwur2ojHIGNjYMpGrfrjxJNm4A6MzZfK2wcpxBwCzV3xcSfOa5rSdQWP0wggEEcCxglcHCGGaXOzXvX4ZDKjng6zfNPKyhdXPx2lTcQzSyLnViGFmCoUy5fdDYj0CGxUP2Xbaq+X6P2fXVz2XBz0tuI/CMSHgKczjY/ZybaUOmTP1XPyOhrpdpxSSM/31qLwLImc9JQrxfm5xfKve7YNl4j1QyZO01tr1Zz+2eP7wPniyl1nP9YgEDcCEDgDPUYdsscv3NEYaGZgk5SwXYGj+Fbggg5lPH7DTm7b86VyZQnPy5mPz5muPf7PHs2Sn8oVzz+bLgpobVIIeDrSpDQqCe3wv6eSrqQTMUrY983I23Lv2rf+VSjx+n793RUxdYW2uwH/ugTuKftPupH9f9My+9x+FCsQiBUBCJyh7vK/p5KupOXE2dXPG2puLMxq1CvnlRLufSZiahVK5UYsjB+hkTv1S5+wlbilV0kXAyO/KNHrH0UcdSSPAATOYJ/631M5nbU/arC5sTCtWa/kfIbmC6WVf/FtS32yVa8s6Pfj6GJAzhZXYv67d6l3a+oAQOCMdvmh91QKGnF4HkAx2nxDjWvUKt6HToR8cmrq3W831NyxmdX0PdFrSZnjkZy1+AMj+y7j2BqPihNBYHQClwhco2+Ev5NhC1jkJs6s/hXHEYIRaCtrSc85Wbj9pp5GvEfAfzHQHclZE59koesdgf8gYC4By1zTYJlDwN/J8PZTOfUzM4vL9zget0DDp4NRqFQjeYrSz+hu/dUabXuJgvtHFw62m0DEJWArdehlpo3inwAAB+ZJREFU1Sx0xEux0M0uYYrXhYWIUQQgcEa543hjWOT0eyJ8ZMayJrmD4Xisgv6gh5L9CFwkzSOmF0hp9ftKkjvtueLKYF8+n5nx39eLxN5xFdqqV99OrKStxG2/DSx0lpJPMrd8sew+wOM/DmkQGAcBCNw4qAesk6cr/SLHHcz9RG520bSX50pjRkrNWmVKaYLLrlFS/upcqXzwqwe88aQgD764ftJhcd/Xqlfme0KnjnzdmZQi2xO6FXt2sbw7W1zZnllaxnfo4u74GNsPgYuZ81jkOh3bc6UsafGLnC6EliVpVtCchiqp3J+ykUJ9d9yWNeuVnFDqNd0OGtk9yJ11Yam8UyitnvyS5lYmVd+na9Wrp1jo6DN2ZLslLZYlJuhjN5VR1nOFUllx4M9ofqlcEaNeUF9qCUDgYuj6zfVLua098QWhLdSndKfXnE1N3xNwznYT1qS2mybYodvQqFcfJVE7/HSgEjT9qD6SL5Wr+vHe+ETbm05Hij5jWRa6vWzn90jsCN/J7ebPqFRihcWOAwleh6Y1N/PF1W+cnBN7QSAYAQhcMG5jz7V3u/JL3Ln4DeGOY3r+/AP+7UjfnwBNV/4ZM/VPWXJOEuXlQmnl/zh+OKylUuAcDlvfvfwHJHYWs7OFushiR8HZfeyaBI8GeeK0lOoJ/tw6gYTPptCm0R5ein0sPezoh0AIAtdPNTgmKgLcqVBn4rl6zmWz1/Ol1Z+Nqs6kl9ukKUvm2qhN50jYvnfQXvmD1Akf9aXwVAvcAR8hWrXqY02aPaAgewz5O4fqs/QZPXI6U8/rxEn4+C9Do73zxLs7vems88XyXqFY/opzLNYgcBIBCNxJdGKyjzoTizoQj8jRva2/jIn5Bpv58t5GrfJ9ZOBVCs4fPzH4gpPgdb5Uxhv3GcQxoVGrfow+o93pzEat0hU+GiVv+j+zx2T3bJZSZIUU73MEj9f54gp/XeGo0KH9N+cXV5/xFIJEaghA4BLiaupALNvu9H2VbEqzlZBPmGLLcXZQp/ywEuqGtv/nqON0H5agUR7dp9P2InpfAs16ZbZJIz1i2xW87np2t0DidY2Er0NB3beQ/QOklELKIwP3b6W2pf6c/OWOBEkQeQqUA90DXGlT2hfKe3TRsk15GoWl8q25pfK3KVwtLK1WC0vlLxWKqx/arxorwwnwB8BwE2FevwRaa5ezO235tX6PH9txSvyPW7cU78wXl59y04ZGmrUq39fU33ayMldc/qCh5sbTrDfeaDZuVh4k4ctS6N7T6wofjfqEUK/QqC+UqWB5sNA9QJmhpC+IrBRiiiDmhRJnqd4HKTwklFqm9IeEVF+aXVg+T/vxZzgBCJzhDhrUvHu3Lj7FncKg+UZ5fKNe/SB1FNedOi1L6F+2djYbtyau56ijdacrlbQ+4TeSjqG+0b8V6WEJNGrVx5v1ykSDxM4JQog3SXg2aKh3yx+EFLdpXyiCeITt9cLU5rUjtmOTYQQgcIY5JCxzuBOwbaU4cDysckMrR6o3QitrlAUp8TGtugs0ZfVhLY3oCAnQ5/ocid6ZZq2y4A80EpynfR5BpCuPT+9fWNFFirwihHydtr3iDySO/0XHfZW2f5nC56SSn+FAw73fzlj2043prYeuX79+5JfdBRajCEDgjHJHuMa01qoWh3BLDac0mhZ6nkriVz+9tHHz0lFPJtJu8/5o9PlPdD/u313LlPisG0fEaAIbtcqvNeqV7ydhfLhRu/gIhfMbtcrj/kDi+CN03Pto+wco/PJG/eIzHO7cvPjHt7936R/F1auxfAes0c6JyLiTBC6iKlEsCAixcbPyBepo+NVPF+LGo1mrPkFX+H+zb3dhf40VCICAYQQgcIY5BObEg0CjXvlpEmiawTqwV9FykEIMBEBg3AQgcOP2QFLrT2G7mvUqzqcU+h1NNpcATkhzfQPLQAAEQAAEhiAAgRsCHrKCgBKq+8CBswaRUAigEBAIhQAELhSMKCStBJq16jTfi+N1Whmg3SBgKgEInKmegV0gAAIgAAKDE9ByQOA0GIiCAAiAAAgkhwAELjm+REtAAARAAAQ0AhA4DQai/RDAMSAAAiAQDwIQuHj4CVaCAAiAAAgMSAACNyAwHA4CIBCcAHKCwCgJQOBGSRt1gQAIgAAIjIwABG5kqFERCIAACIBAcAKD54TADc4MOUAABEAABGJAAAIXAyfBRBAAARAAgcEJQOAGZ5bUHGgXCIAACCSKAAQuUe5EY0AABEAABBwCEDiHBNYgAALBCSAnCBhIAAJnoFNgEgiAAAiAwPAEIHDDM0QJIAACIAACwQlElhMCFxlaFAwCIAACIDBOAhC4cdJH3SAAAiAAApERgMBFhtacgmEJCIAACKSRAAQujV5Hm0EABEAgBQQgcClwMpoIAsEJICcIxJcABC6+voPlIAACIAACJxCAwJ0AB7tAAARAAASCExh3TgjcuD2A+kEABEAABCIhAIGLBCsKBQEQAAEQGDcBCNy4PTBM/cgLAiAAAiBwLAEI3LFosAMEQAAEQCDOBCBwcfYebAeB4ASQEwQSTwACl3gXo4EgAAIgkE4CELh0+h2tBgEQAIHgBGKSEwIXE0fBTBAAARAAgcEIQOAG44WjQQAEQAAEYkIAAmeko2AUCIAACIDAsAQgcMMSRH4QAAEQAAEjCUDgjHQLjAKB4ASQEwRAoEfg/wEAAP///lsnxAAAAAZJREFUAwC4Lh6Ci4C7IgAAAABJRU5ErkJggg==', 'font-signature-1', 'Active', '2026-09-01 19:43:38', '2026-09-03 04:45:19'),
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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=30;

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `document_identifiers`
--
ALTER TABLE `document_identifiers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

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
