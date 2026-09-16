-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Sep 16, 2026 at 09:19 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `db_bex_sign`
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
(37, 24, 'Document \"My doc vimal 2.pdf\" created with ID: BEX-DOC-2026-0024-E5JGIK41-LX89QGT3NHA4F9UDSZPQTX', '::1', '2026-09-03 20:16:04'),
(38, 24, 'Document \"Blank Agreement Document.pdf\" dispatched for signature to vimal@bexcodeservices.com', '::1', '2026-09-03 20:18:36'),
(41, 24, 'Document \"My doc vimal 2.pdf\" dispatched for signature to vimal@bexcodeservices.com', '::1', '2026-09-04 08:37:25'),
(42, 24, 'Document ID 24 electronically signed by Vimal Chavda (vimal@bexcodeservices.com) and marked Completed', '::1', '2026-09-04 08:38:24'),
(109, 34, 'Document \"Blank Agreement Document.pdf\" created as draft with ID: BEX-DOC-2026-0034-OUEP0CO9-46Y6RX8KV1PXD47YGRDVC', '::1', '2026-09-16 12:54:24'),
(110, 34, 'Signature request emailed to Vimal Chavda (vimal@bexcodeservices.com)', '127.0.0.1', '2026-09-16 12:59:15'),
(111, 34, 'Document \"Blank Agreement Document.pdf\" sent for signature (in order) to: vimal@bexcodeservices.com', '::1', '2026-09-16 12:59:15'),
(112, 34, 'Vimal Chavda (vimal@bexcodeservices.com) viewed the document', '::1', '2026-09-16 13:00:09'),
(113, 34, 'Vimal Chavda (vimal@bexcodeservices.com) viewed the document', '::1', '2026-09-16 13:00:09'),
(114, 34, 'Vimal Chavda (vimal@bexcodeservices.com) signed the document', '::1', '2026-09-16 13:01:37'),
(115, 34, 'Signature request emailed to vnc (chavdavimaln@gmail.com)', '127.0.0.1', '2026-09-16 13:01:42'),
(116, 34, 'vnc (chavdavimaln@gmail.com) viewed the document', '::1', '2026-09-16 13:03:29'),
(117, 34, 'vnc (chavdavimaln@gmail.com) viewed the document', '::1', '2026-09-16 13:03:29'),
(118, 34, 'vc (chavdavimaln@gmail.com) signed the document', '::1', '2026-09-16 13:03:51'),
(119, 34, 'All recipients completed \"Blank Agreement Document.pdf\". Document marked Completed.', '::1', '2026-09-16 13:03:51'),
(120, 34, 'Completed documents (1 signed PDF + certificate of completion) emailed to: vimal@bexcodeservices.com, chavdavimaln@gmail.com', '127.0.0.1', '2026-09-16 13:03:56'),
(121, 35, 'Document \"Blank Agreement Document.pdf\" created as draft with ID: BEX-DOC-2026-0035-RI6Q2914-E4K0JNKDF381717U9NVSTI', '::1', '2026-09-16 13:19:03'),
(122, 35, 'Signature request emailed to Vimal Chavda (vimal@bexcodeservices.com)', '127.0.0.1', '2026-09-16 13:25:30'),
(123, 35, 'Document \"Blank Agreement Document.pdf\" sent for signature (in order) to: vimal@bexcodeservices.com', '::1', '2026-09-16 13:25:30'),
(124, 35, 'Vimal Chavda (vimal@bexcodeservices.com) viewed the document', '::1', '2026-09-16 13:25:47'),
(125, 35, 'Vimal Chavda (vimal@bexcodeservices.com) signed the document', '::1', '2026-09-16 13:25:59'),
(126, 35, 'Signature request emailed to vnc (chavdavimaln@gmail.com)', '127.0.0.1', '2026-09-16 13:26:04'),
(127, 35, 'vnc (chavdavimaln@gmail.com) viewed the document', '::1', '2026-09-16 13:26:22'),
(128, 35, 'vnc (chavdavimaln@gmail.com) viewed the document', '::1', '2026-09-16 13:26:22'),
(129, 35, 'vc (chavdavimaln@gmail.com) signed the document', '::1', '2026-09-16 13:26:32'),
(130, 35, 'All recipients completed \"Blank Agreement Document.pdf\". Document marked Completed.', '::1', '2026-09-16 13:26:33'),
(131, 35, 'Completed documents (1 signed PDF + certificate of completion) emailed to: vimal@bexcodeservices.com, chavdavimaln@gmail.com', '127.0.0.1', '2026-09-16 13:26:41'),
(132, 35, 'Document \"My first document\" sent for signature (in order) to: ', '::1', '2026-09-16 15:06:56'),
(133, 35, 'Document \"My first document\" sent for signature (in order) to: ', '::1', '2026-09-16 16:53:29'),
(134, 36, 'Document \"Verify resend completed.pdf\" created as draft with ID: BEX-DOC-2026-0036-YAUCPFDW-5RUM8U4IGLMFXORB5IM5HM', '::1', '2026-09-16 17:15:01'),
(135, 36, 'Signature request emailed to Order A (order.a@example.com)', '127.0.0.1', '2026-09-16 17:15:02'),
(136, 36, 'Document \"Verify resend completed.pdf\" sent for signature (in order) to: order.a@example.com', '::1', '2026-09-16 17:15:02'),
(137, 36, 'Order A (order.a@example.com) signed the document', '::1', '2026-09-16 17:15:02'),
(138, 36, 'Signature request emailed to Order B (order.b@example.com)', '127.0.0.1', '2026-09-16 17:15:02'),
(139, 36, 'Order B (order.b@example.com) signed the document', '::1', '2026-09-16 17:15:03'),
(140, 36, 'All recipients completed \"Verify resend completed.pdf\". Document marked Completed.', '::1', '2026-09-16 17:15:03'),
(141, 36, 'Completed documents (1 signed PDF + certificate of completion) emailed to: vimal@bexcodeservices.com, order.a@example.com, order.b@example.com', '127.0.0.1', '2026-09-16 17:15:03'),
(142, 36, 'Signature request emailed to Order A (order.a@example.com)', '127.0.0.1', '2026-09-16 17:15:04'),
(143, 36, 'Signing restarted for \"Verify resend completed.pdf\": every recipient must sign again (previous status: Completed)', '::1', '2026-09-16 17:15:04'),
(144, 36, 'Document \"Verify resend completed.pdf\" sent for signature (in order) to: order.a@example.com', '::1', '2026-09-16 17:15:04'),
(145, 36, 'Order A (order.a@example.com) signed the document', '::1', '2026-09-16 17:15:05'),
(146, 36, 'Signature request emailed to Order B (order.b@example.com)', '127.0.0.1', '2026-09-16 17:15:05'),
(147, 37, 'Document \"Verify changed order.pdf\" created as draft with ID: BEX-DOC-2026-0037-L9X67KSJ-GDLV8IDN43VSGQAEUUHE', '::1', '2026-09-16 17:15:06'),
(148, 37, 'Signature request emailed to Order B (order.b@example.com)', '127.0.0.1', '2026-09-16 17:15:06'),
(149, 37, 'Document \"Verify changed order.pdf\" sent for signature (in order) to: order.b@example.com', '::1', '2026-09-16 17:15:06'),
(150, 37, 'Order B (order.b@example.com) signed the document', '::1', '2026-09-16 17:15:06'),
(151, 37, 'Signature request emailed to Order A (order.a@example.com)', '127.0.0.1', '2026-09-16 17:15:07'),
(152, 38, 'Document \"Verify shared step.pdf\" created as draft with ID: BEX-DOC-2026-0038-JRZ9P5A2-R722S7Y5WSHFNLL2195RRL', '::1', '2026-09-16 17:15:07'),
(153, 38, 'Signature request emailed to Order A (order.a@example.com)', '127.0.0.1', '2026-09-16 17:15:08'),
(154, 38, 'Signature request emailed to Order B (order.b@example.com)', '127.0.0.1', '2026-09-16 17:15:08'),
(155, 38, 'Document \"Verify shared step.pdf\" sent for signature (in order) to: order.a@example.com, order.b@example.com', '::1', '2026-09-16 17:15:08'),
(156, 38, 'Order A (order.a@example.com) signed the document', '::1', '2026-09-16 17:15:08'),
(157, 38, 'Order B (order.b@example.com) signed the document', '::1', '2026-09-16 17:15:08'),
(158, 38, 'Signature request emailed to Order C (order.c@example.com)', '127.0.0.1', '2026-09-16 17:15:09'),
(159, 39, 'Document \"Verify all at once.pdf\" created as draft with ID: BEX-DOC-2026-0039-OYLEXCKK-7K8YJCOCOJRUBG52EA4728', '::1', '2026-09-16 17:15:09'),
(160, 39, 'Signature request emailed to Order A (order.a@example.com)', '127.0.0.1', '2026-09-16 17:15:09'),
(161, 39, 'Signature request emailed to Order B (order.b@example.com)', '127.0.0.1', '2026-09-16 17:15:10'),
(162, 39, 'Signature request emailed to Order C (order.c@example.com)', '127.0.0.1', '2026-09-16 17:15:10'),
(163, 39, 'Document \"Verify all at once.pdf\" sent for signature (parallel) to: order.a@example.com, order.b@example.com, order.c@example.com', '::1', '2026-09-16 17:15:10'),
(164, 40, 'Document \"Verify list order.pdf\" created as draft with ID: BEX-DOC-2026-0040-E66PNQBE-S70LKP02IK4Z7592HVNTD', '::1', '2026-09-16 17:15:10'),
(165, 36, 'Signature request emailed to Order A (order.a@example.com)', '127.0.0.1', '2026-09-16 17:23:41'),
(166, 36, 'Signing restarted for \"Verify resend completed.pdf\": every recipient must sign again (previous status: In Progress)', '::1', '2026-09-16 17:23:41'),
(167, 36, 'Document \"Verify resend completed.pdf\" sent for signature (in order) to: order.a@example.com', '::1', '2026-09-16 17:23:41'),
(168, 41, 'Document \"Blank Agreement Document.pdf\" created as draft with ID: BEX-DOC-2026-0041-KATW7LGG-YUA0T8L8XRKXY7DG6G7LI', '::1', '2026-09-16 17:29:52'),
(169, 42, 'Document \"Blank Agreement Document.pdf\" created as draft with ID: BEX-DOC-2026-0042-FKWVS7YO-0C4FNJRX31NXUBSSAVKSDC', '::1', '2026-09-16 17:34:34'),
(170, 42, 'Signature request emailed to vnc (chavdavimaln@gmail.com)', '127.0.0.1', '2026-09-16 17:42:32'),
(171, 42, 'Document \"doc-2\" sent for signature (in order) to: chavdavimaln@gmail.com', '::1', '2026-09-16 17:42:32'),
(172, 42, 'vnc (chavdavimaln@gmail.com) viewed the document', '::1', '2026-09-16 17:43:00'),
(173, 42, 'vc (chavdavimaln@gmail.com) signed the document', '::1', '2026-09-16 18:44:00'),
(174, 42, 'Signature request emailed to Vimal Chavda (vimal@bexcodeservices.com)', '127.0.0.1', '2026-09-16 18:44:04'),
(175, 43, 'Document \"Verify multi A\" created as draft with ID: BEX-DOC-2026-0043-AN3HI7BT-86XU862008H720TRK4A6L9', '::1', '2026-09-16 18:58:15'),
(176, 43, 'Signature request emailed to Vimal Chavda (vimal@bexcodeservices.com)', '127.0.0.1', '2026-09-16 18:58:16'),
(177, 43, 'Document \"Verify multi A\" sent for signature (in order) to: vimal@bexcodeservices.com', '::1', '2026-09-16 18:58:16'),
(178, 43, 'Vimal Chavda (vimal@bexcodeservices.com) signed the document', '::1', '2026-09-16 18:58:16'),
(179, 43, 'Signature request emailed to Order B (order.b@example.com)', '127.0.0.1', '2026-09-16 18:58:16'),
(180, 43, 'Order B (order.b@example.com) signed the document', '::1', '2026-09-16 18:58:18'),
(181, 43, 'All recipients completed \"Verify multi A\". Document marked Completed.', '::1', '2026-09-16 18:58:18'),
(182, 43, 'Completed documents (2 signed PDFs + certificate of completion) emailed to: vimal@bexcodeservices.com, order.b@example.com', '127.0.0.1', '2026-09-16 18:58:19'),
(183, 44, 'Created \"Verify multi A (Copy)\" as an editable copy of \"Verify multi A\" (BEX-DOC-2026-0043-AN3HI7BT-86XU862008H720TRK4A6L9)', '::1', '2026-09-16 18:58:20'),
(184, 43, 'Copied to a new draft \"Verify multi A (Copy)\" for editing; this request was not changed', '::1', '2026-09-16 18:58:20'),
(185, 45, 'Created \"Verify multi A (Copy 2)\" as an editable copy of \"Verify multi A\" (BEX-DOC-2026-0043-AN3HI7BT-86XU862008H720TRK4A6L9)', '::1', '2026-09-16 18:58:21'),
(186, 43, 'Copied to a new draft \"Verify multi A (Copy 2)\" for editing; this request was not changed', '::1', '2026-09-16 18:58:21'),
(187, 44, 'Signature request emailed to Vimal Chavda (vimal@bexcodeservices.com)', '127.0.0.1', '2026-09-16 19:00:31'),
(188, 44, 'Document \"Verify multi A (Copy)\" sent for signature (in order) to: vimal@bexcodeservices.com', '::1', '2026-09-16 19:00:31'),
(189, 44, 'Vimal Chavda (vimal@bexcodeservices.com) viewed the document', '::1', '2026-09-16 19:00:40'),
(190, 44, 'Vimal Chavda (vimal@bexcodeservices.com) signed the document', '::1', '2026-09-16 19:00:55'),
(191, 44, 'Signature request emailed to Order B (order.b@example.com)', '127.0.0.1', '2026-09-16 19:00:55'),
(192, 46, 'Created \"Verify multi A (Copy 3)\" as an editable copy of \"Verify multi A\" (BEX-DOC-2026-0043-AN3HI7BT-86XU862008H720TRK4A6L9)', '::1', '2026-09-16 19:01:39'),
(193, 43, 'Copied to a new draft \"Verify multi A (Copy 3)\" for editing; this request was not changed', '::1', '2026-09-16 19:01:39'),
(194, 47, 'Document cloned from ID 42 as new document with BexSign ID BEX-DOC-2026-0047-4I73PHWE-GNWHTP5DN09VP130OT31U', '::1', '2026-09-16 19:05:52'),
(195, 42, 'Vimal Chavda (vimal@bexcodeservices.com) viewed the document', '::1', '2026-09-16 19:07:12'),
(196, 42, 'Vimal Chavda (vimal@bexcodeservices.com) signed the document', '::1', '2026-09-16 19:07:26'),
(197, 42, 'All recipients completed \"doc-2\". Document marked Completed.', '::1', '2026-09-16 19:07:26'),
(198, 42, 'Completed documents (2 signed PDFs + certificate of completion) emailed to: vimal@bexcodeservices.com, chavdavimaln@gmail.com', '127.0.0.1', '2026-09-16 19:07:30');

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
  `status` varchar(50) DEFAULT 'Draft',
  `signing_order` enum('parallel','sequential') DEFAULT 'parallel',
  `recipient_email` varchar(255) DEFAULT NULL,
  `template_used` varchar(150) DEFAULT NULL,
  `custom_message` text DEFAULT NULL,
  `reminder_days` int(11) DEFAULT 3,
  `expiration_days` int(11) DEFAULT 30,
  `scheduled_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `sent_at` datetime DEFAULT NULL,
  `document_type` varchar(50) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `validity` varchar(50) DEFAULT NULL,
  `auto_reminders` tinyint(1) DEFAULT 1,
  `allow_comments` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `documents`
--

INSERT INTO `documents` (`id`, `user_id`, `document_name`, `file_path`, `folder_name`, `status`, `signing_order`, `recipient_email`, `template_used`, `custom_message`, `reminder_days`, `expiration_days`, `scheduled_at`, `completed_at`, `created_at`, `updated_at`, `sent_at`, `document_type`, `description`, `validity`, `auto_reminders`, `allow_comments`) VALUES
(24, 1, 'second document.pdf', '/uploads/sample.pdf', 'None', 'Trashed', 'sequential', 'vimal@bexcodeservices.com', NULL, NULL, 5, 15, NULL, NULL, '2026-09-03 20:16:04', '2026-09-04 20:37:56', NULL, NULL, NULL, NULL, 1, 0),
(34, 1, 'Blank Agreement Document.pdf', '/uploads/completed/34/01-Blank-Agreement-Document.pdf', 'None', 'Completed', 'sequential', 'vimal@bexcodeservices.com', NULL, NULL, 5, 15, NULL, '2026-09-16 18:33:51', '2026-09-16 12:54:23', '2026-09-16 13:03:51', '2026-09-16 18:29:11', 'Others', NULL, 'Forever', 1, 0),
(35, 1, 'My first document', '/uploads/sample.pdf', 'None', 'In Progress', 'sequential', 'vimal@bexcodeservices.com', NULL, NULL, 5, 15, NULL, '2026-09-16 18:56:32', '2026-09-16 13:19:02', '2026-09-16 15:07:58', '2026-09-16 18:55:23', 'Others', NULL, 'Forever', 1, 0),
(36, 1, 'Verify resend completed.pdf', '/uploads/completed/36/01-Verify-resend-completed.pdf', 'General', 'Trashed', 'sequential', 'order.a@example.com', NULL, NULL, 3, 30, NULL, NULL, '2026-09-16 17:15:01', '2026-09-16 17:24:14', '2026-09-16 22:53:41', NULL, NULL, NULL, 1, 0),
(37, 1, 'Verify changed order.pdf', '/uploads/sample.pdf', 'General', 'Trashed', 'sequential', 'order.b@example.com', NULL, NULL, 3, 30, NULL, NULL, '2026-09-16 17:15:05', '2026-09-16 17:24:14', '2026-09-16 22:45:06', NULL, NULL, NULL, 1, 0),
(38, 1, 'Verify shared step.pdf', '/uploads/sample.pdf', 'General', 'Trashed', 'sequential', 'order.a@example.com', NULL, NULL, 3, 30, NULL, NULL, '2026-09-16 17:15:07', '2026-09-16 17:24:14', '2026-09-16 22:45:08', NULL, NULL, NULL, 1, 0),
(39, 1, 'Verify all at once.pdf', '/uploads/sample.pdf', 'General', 'Trashed', 'parallel', 'order.a@example.com', NULL, NULL, 3, 30, NULL, NULL, '2026-09-16 17:15:09', '2026-09-16 17:24:14', '2026-09-16 22:45:09', NULL, NULL, NULL, 1, 0),
(40, 1, 'Verify list order.pdf', '/uploads/sample.pdf', 'General', 'Trashed', 'sequential', 'order.c@example.com', NULL, NULL, 3, 30, NULL, NULL, '2026-09-16 17:15:10', '2026-09-16 17:24:15', NULL, NULL, NULL, NULL, 1, 0),
(41, 1, 'doc 2', '/uploads/sample.pdf', 'None', 'Draft', 'sequential', 'vimal@bexcodeservices.com', NULL, NULL, 5, 15, NULL, NULL, '2026-09-16 17:29:51', '2026-09-16 17:30:01', NULL, 'Others', NULL, 'Forever', 1, 0),
(42, 1, 'doc-2', '/uploads/completed/42/01-doc-2.pdf', 'None', 'Completed', 'sequential', 'chavdavimaln@gmail.com', NULL, NULL, 5, 15, NULL, '2026-09-17 00:37:26', '2026-09-16 17:34:34', '2026-09-16 19:07:26', '2026-09-16 23:12:28', 'Others', NULL, 'Forever', 1, 0),
(43, 1, 'Verify multi A', '/uploads/completed/43/01-Verify-multi-A.pdf', 'General', 'Trashed', 'sequential', 'vimal@bexcodeservices.com', NULL, NULL, 3, 30, NULL, '2026-09-17 00:28:18', '2026-09-16 18:58:14', '2026-09-16 19:02:44', '2026-09-17 00:28:15', NULL, NULL, NULL, 1, 0),
(44, 1, 'Verify multi A (Copy)', '/uploads/sample.pdf', 'General', 'Trashed', 'sequential', 'vimal@bexcodeservices.com', NULL, NULL, 3, 30, NULL, NULL, '2026-09-16 18:58:19', '2026-09-16 19:02:45', '2026-09-17 00:30:31', NULL, NULL, NULL, 1, 0),
(45, 1, 'Verify multi A (Copy 2)', '/uploads/sample.pdf', 'General', 'Trashed', 'sequential', 'vimal@bexcodeservices.com', NULL, NULL, 3, 30, NULL, NULL, '2026-09-16 18:58:21', '2026-09-16 19:02:45', NULL, NULL, NULL, NULL, 1, 0),
(46, 1, 'Verify multi A (Copy 3)', '/uploads/sample.pdf', 'General', 'Trashed', 'sequential', 'vimal@bexcodeservices.com', NULL, NULL, 3, 30, NULL, NULL, '2026-09-16 19:01:38', '2026-09-16 19:02:45', NULL, NULL, NULL, NULL, 1, 0),
(47, 1, 'Document 1.pdf', '/uploads/sample.pdf', 'None', 'Draft', 'parallel', 'chavdavimaln@gmail.com', NULL, NULL, 3, 30, NULL, NULL, '2026-09-16 19:05:52', '2026-09-16 19:06:12', NULL, NULL, NULL, NULL, 1, 0);

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
(90, 34, 20, 1, 'Signature', 'Signature', NULL, 1, 60, 533, 200, 70, '{\"value\":\"Signature\",\"docIndex\":0,\"assigneeId\":20,\"assignee\":\"Vimal Chavda\",\"assigneeEmail\":\"vimal@bexcodeservices.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"textColor\":\"#00a884\",\"clientId\":1789563513933,\"signatureImage\":\"data:image/png;base64,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\",\"signatureStyle\":\"font-signature-3\",\"signerName\":\"Vimal Chavda\",\"signerEmail\":\"vimal@bexcodeservices.com\",\"signedAt\":\"2026-09-16T13:01:37.835Z\"}'),
(91, 34, 21, 1, 'Full name', 'Full name', NULL, 1, 445, 528, 160, 40, '{\"value\":\"vnc chavda\",\"docIndex\":0,\"assigneeId\":21,\"assignee\":\"vnc\",\"assigneeEmail\":\"chavdavimaln@gmail.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"textColor\":\"#0284c7\",\"nameFormat\":\"Full Name\",\"clientId\":1789563539061,\"signerName\":\"vc\",\"signerEmail\":\"chavdavimaln@gmail.com\",\"signedAt\":\"2026-09-16T13:03:51.014Z\"}'),
(92, 34, 21, 1, 'Signature', 'Signature', NULL, 1, 456, 598, 200, 70, '{\"value\":\"Signature\",\"docIndex\":0,\"assigneeId\":21,\"assignee\":\"vnc\",\"assigneeEmail\":\"chavdavimaln@gmail.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"textColor\":\"#0284c7\",\"clientId\":1789563544701,\"signatureImage\":\"vc\",\"signatureStyle\":\"font-signature-1\",\"signerName\":\"vc\",\"signerEmail\":\"chavdavimaln@gmail.com\",\"signedAt\":\"2026-09-16T13:03:51.014Z\"}'),
(136, 35, 22, 1, 'Signature', 'Signature', NULL, 1, 60, 533, 200, 70, '{\"value\":\"Signature\",\"docIndex\":0,\"assigneeId\":22,\"assignee\":\"Vimal Chavda\",\"assigneeEmail\":\"vimal@bexcodeservices.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"textColor\":\"#00a884\",\"clientId\":1789565071830,\"signatureStyle\":\"font-signature-3\",\"signerName\":\"Vimal Chavda\",\"signerEmail\":\"vimal@bexcodeservices.com\",\"signedAt\":\"2026-09-16T13:25:59.051Z\"}'),
(137, 35, 22, 1, 'Full name', 'Full name', NULL, 1, 60, 587, 160, 40, '{\"value\":\"Vimal n Chavda\",\"docIndex\":0,\"assigneeId\":22,\"assignee\":\"Vimal Chavda\",\"assigneeEmail\":\"vimal@bexcodeservices.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"textColor\":\"#00a884\",\"nameFormat\":\"Full Name\",\"clientId\":1789565077022,\"signerName\":\"Vimal Chavda\",\"signerEmail\":\"vimal@bexcodeservices.com\",\"signedAt\":\"2026-09-16T13:25:59.051Z\"}'),
(138, 35, 23, 1, 'Signature', 'Signature', NULL, 1, 520, 528, 200, 70, '{\"value\":\"Signature\",\"docIndex\":0,\"assigneeId\":23,\"assignee\":\"vnc\",\"assigneeEmail\":\"chavdavimaln@gmail.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"textColor\":\"#0284c7\",\"clientId\":1789565096414,\"signatureStyle\":\"font-signature-1\",\"signerName\":\"vc\",\"signerEmail\":\"chavdavimaln@gmail.com\",\"signedAt\":\"2026-09-16T13:26:32.294Z\"}'),
(139, 35, 23, 1, 'Sign date', 'Sign date', NULL, 1, 522, 589, 160, 40, '{\"value\":\"Aug 26 2026\",\"docIndex\":0,\"assigneeId\":23,\"assignee\":\"vnc\",\"assigneeEmail\":\"chavdavimaln@gmail.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"textColor\":\"#0284c7\",\"dateFormat\":\"MMM dd yyyy HH:mm z\",\"clientId\":1789565104246,\"signerName\":\"vc\",\"signerEmail\":\"chavdavimaln@gmail.com\",\"signedAt\":\"2026-09-16T13:26:32.294Z\"}'),
(140, 35, 22, 1, 'Job title', 'Job title', NULL, 1, 65, 665, 160, 40, '{\"value\":\"Job title\",\"docIndex\":0,\"assigneeId\":22,\"assignee\":\"Vimal Chavda\",\"assigneeEmail\":\"vimal@bexcodeservices.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"textColor\":\"#00a884\",\"clientId\":1789571313809}'),
(141, 35, 22, 1, 'Signature', 'Signature', NULL, 1, 60, 533, 200, 70, '{\"value\":\"Signature\",\"docIndex\":1,\"assigneeId\":22,\"assignee\":\"Vimal Chavda\",\"assigneeEmail\":\"vimal@bexcodeservices.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"textColor\":\"#00a884\",\"clientId\":1789571167625}'),
(142, 35, 23, 1, 'Split text', 'Split text', NULL, 1, 518, 535, 16, 20, '{\"value\":\"\",\"docIndex\":1,\"assigneeId\":23,\"assignee\":\"vnc\",\"assigneeEmail\":\"chavdavimaln@gmail.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"textColor\":\"#0284c7\",\"charCount\":10,\"charSpace\":0,\"gridValue\":[\"s\",\"-\",\"1\",\"\",\"\",\"\",\"\",\"\",\"\",\"\"],\"clientId\":1789571181009}'),
(151, 37, 26, 1, 'Signature', 'Signature', NULL, 1, 60, 400, 150, 40, '{\"assignee\":\"Order B\",\"assigneeEmail\":\"order.b@example.com\",\"value\":\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==\",\"docIndex\":0,\"clientId\":\"f0\",\"signatureImage\":\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==\",\"signatureStyle\":\"font-signature-1\",\"signerName\":\"Order B\",\"signerEmail\":\"order.b@example.com\",\"signedAt\":\"2026-09-16T17:15:06.781Z\"}'),
(152, 37, 27, 1, 'Signature', 'Signature', NULL, 1, 60, 400, 150, 40, '{\"assignee\":\"Order A\",\"assigneeEmail\":\"order.a@example.com\",\"value\":\"Signature\",\"docIndex\":0,\"clientId\":\"f1\"}'),
(156, 38, 28, 1, 'Signature', 'Signature', NULL, 1, 60, 400, 150, 40, '{\"assignee\":\"Order A\",\"assigneeEmail\":\"order.a@example.com\",\"value\":\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==\",\"docIndex\":0,\"clientId\":\"f0\",\"signatureImage\":\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==\",\"signatureStyle\":\"font-signature-1\",\"signerName\":\"Order A\",\"signerEmail\":\"order.a@example.com\",\"signedAt\":\"2026-09-16T17:15:08.417Z\"}'),
(157, 38, 29, 1, 'Signature', 'Signature', NULL, 1, 60, 400, 150, 40, '{\"assignee\":\"Order B\",\"assigneeEmail\":\"order.b@example.com\",\"value\":\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==\",\"docIndex\":0,\"clientId\":\"f1\",\"signatureImage\":\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==\",\"signatureStyle\":\"font-signature-1\",\"signerName\":\"Order B\",\"signerEmail\":\"order.b@example.com\",\"signedAt\":\"2026-09-16T17:15:08.679Z\"}'),
(158, 38, 30, 1, 'Signature', 'Signature', NULL, 1, 60, 400, 150, 40, '{\"assignee\":\"Order C\",\"assigneeEmail\":\"order.c@example.com\",\"value\":\"Signature\",\"docIndex\":0,\"clientId\":\"f2\"}'),
(162, 39, 31, 1, 'Signature', 'Signature', NULL, 1, 60, 400, 150, 40, '{\"assignee\":\"Order A\",\"assigneeEmail\":\"order.a@example.com\",\"value\":\"Signature\",\"docIndex\":0,\"clientId\":\"f0\"}'),
(163, 39, 32, 1, 'Signature', 'Signature', NULL, 1, 60, 400, 150, 40, '{\"assignee\":\"Order B\",\"assigneeEmail\":\"order.b@example.com\",\"value\":\"Signature\",\"docIndex\":0,\"clientId\":\"f1\"}'),
(164, 39, 33, 1, 'Signature', 'Signature', NULL, 1, 60, 400, 150, 40, '{\"assignee\":\"Order C\",\"assigneeEmail\":\"order.c@example.com\",\"value\":\"Signature\",\"docIndex\":0,\"clientId\":\"f2\"}'),
(165, 40, 34, 1, 'Signature', 'Signature', NULL, 1, 60, 400, 150, 40, '{\"assignee\":\"Order C\",\"assigneeEmail\":\"order.c@example.com\",\"value\":\"Signature\",\"docIndex\":0,\"clientId\":\"f0\"}'),
(166, 40, 35, 1, 'Signature', 'Signature', NULL, 1, 60, 400, 150, 40, '{\"assignee\":\"Order A\",\"assigneeEmail\":\"order.a@example.com\",\"value\":\"Signature\",\"docIndex\":0,\"clientId\":\"f1\"}'),
(167, 36, 24, 1, 'Signature', 'Signature', NULL, 1, 60, 400, 150, 40, '{\"assignee\":\"Order A\",\"assigneeEmail\":\"order.a@example.com\",\"value\":\"Signature\",\"docIndex\":0,\"clientId\":\"f0\"}'),
(168, 36, 25, 1, 'Signature', 'Signature', NULL, 1, 60, 400, 150, 40, '{\"assignee\":\"Order B\",\"assigneeEmail\":\"order.b@example.com\",\"value\":\"Signature\",\"docIndex\":0,\"clientId\":\"f1\"}'),
(223, 42, 37, 1, 'Signature', 'Signature', NULL, 1, 60, 533, 200, 70, '{\"value\":\"Signature\",\"docIndex\":0,\"assigneeId\":37,\"assignee\":\"Vimal Chavda\",\"assigneeEmail\":\"vimal@bexcodeservices.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"textColor\":\"#00a884\",\"clientId\":1789580092541,\"signatureImage\":\"data:image/png;base64,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\",\"signatureStyle\":\"font-signature-1\",\"signerName\":\"Vimal Chavda\",\"signerEmail\":\"vimal@bexcodeservices.com\",\"signedAt\":\"2026-09-16T19:07:25.377Z\"}'),
(224, 42, 37, 1, 'Job title', 'Job title', NULL, 1, 60, 587, 160, 40, '{\"value\":\"hghg\",\"docIndex\":0,\"assigneeId\":37,\"assignee\":\"Vimal Chavda\",\"assigneeEmail\":\"vimal@bexcodeservices.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"textColor\":\"#00a884\",\"clientId\":1789580099197,\"signerName\":\"Vimal Chavda\",\"signerEmail\":\"vimal@bexcodeservices.com\",\"signedAt\":\"2026-09-16T19:07:25.377Z\"}'),
(225, 42, 37, 1, 'Sign date', 'Sign date', NULL, 1, 60, 641, 160, 40, '{\"value\":\"Sep 17, 2026\",\"docIndex\":0,\"assigneeId\":37,\"assignee\":\"Vimal Chavda\",\"assigneeEmail\":\"vimal@bexcodeservices.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"textColor\":\"#00a884\",\"dateFormat\":\"MMM dd yyyy HH:mm z\",\"clientId\":1789580104852,\"signerName\":\"Vimal Chavda\",\"signerEmail\":\"vimal@bexcodeservices.com\",\"signedAt\":\"2026-09-16T19:07:25.377Z\"}'),
(226, 42, 38, 1, 'Company', 'Company', NULL, 1, 475, 530, 160, 40, '{\"value\":\"Bexcode Services\",\"docIndex\":0,\"assigneeId\":38,\"assignee\":\"vnc\",\"assigneeEmail\":\"chavdavimaln@gmail.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"textColor\":\"#0284c7\",\"clientId\":1789580349885,\"signerName\":\"vc\",\"signerEmail\":\"chavdavimaln@gmail.com\",\"signedAt\":\"2026-09-16T18:43:59.958Z\"}'),
(227, 42, 38, 1, 'Checkbox', 'Checkbox', NULL, 1, 399, 534, 160, 40, '{\"value\":\"true\",\"docIndex\":0,\"assigneeId\":38,\"assignee\":\"vnc\",\"assigneeEmail\":\"chavdavimaln@gmail.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"textColor\":\"#0284c7\",\"checked\":false,\"clientId\":1789580435957,\"signerName\":\"vc\",\"signerEmail\":\"chavdavimaln@gmail.com\",\"signedAt\":\"2026-09-16T18:43:59.958Z\"}'),
(228, 42, 37, 1, 'Sign date', 'Sign date', NULL, 1, 497, 531, 160, 40, '{\"value\":\"Sep 17, 2026\",\"docIndex\":1,\"assigneeId\":37,\"assignee\":\"Vimal Chavda\",\"assigneeEmail\":\"vimal@bexcodeservices.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"textColor\":\"#00a884\",\"dateFormat\":\"MMM dd yyyy HH:mm z\",\"clientId\":1789580143549,\"signerName\":\"Vimal Chavda\",\"signerEmail\":\"vimal@bexcodeservices.com\",\"signedAt\":\"2026-09-16T19:07:25.377Z\"}'),
(229, 42, 37, 1, 'Signature', 'Signature', NULL, 1, 497, 595, 200, 70, '{\"value\":\"Signature\",\"docIndex\":1,\"assigneeId\":37,\"assignee\":\"Vimal Chavda\",\"assigneeEmail\":\"vimal@bexcodeservices.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"textColor\":\"#00a884\",\"clientId\":1789580152500,\"signatureImage\":\"data:image/png;base64,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\",\"signatureStyle\":\"font-signature-1\",\"signerName\":\"Vimal Chavda\",\"signerEmail\":\"vimal@bexcodeservices.com\",\"signedAt\":\"2026-09-16T19:07:25.377Z\"}'),
(237, 43, 39, 1, 'Signature', 'Signature', NULL, 1, 60, 420, 150, 40, '{\"assignee\":\"Vimal Chavda\",\"assigneeEmail\":\"vimal@bexcodeservices.com\",\"assigneeId\":39,\"value\":\"Signature\",\"docIndex\":0,\"clientId\":\"a1\",\"signatureImage\":\"data:image/png;base64,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\",\"signatureStyle\":\"font-signature-1\",\"signerName\":\"Vimal Chavda\",\"signerEmail\":\"vimal@bexcodeservices.com\",\"signedAt\":\"2026-09-16T18:58:16.116Z\"}'),
(238, 43, 39, 1, 'Company', 'Company', NULL, 1, 60, 420, 150, 40, '{\"assignee\":\"Vimal Chavda\",\"assigneeEmail\":\"vimal@bexcodeservices.com\",\"assigneeId\":39,\"value\":\"Bexcode Services\",\"docIndex\":0,\"clientId\":\"a2\",\"signerName\":\"Vimal Chavda\",\"signerEmail\":\"vimal@bexcodeservices.com\",\"signedAt\":\"2026-09-16T18:58:16.116Z\"}'),
(239, 43, 40, 1, 'Full name', 'Full name', NULL, 1, 60, 420, 150, 40, '{\"assignee\":\"Order B\",\"assigneeEmail\":\"order.b@example.com\",\"assigneeId\":40,\"value\":\"Order B\",\"docIndex\":0,\"clientId\":\"b1\",\"signerName\":\"Order B\",\"signerEmail\":\"order.b@example.com\",\"signedAt\":\"2026-09-16T18:58:17.383Z\"}'),
(240, 43, 40, 1, 'Checkbox', 'Checkbox', NULL, 1, 60, 420, 150, 40, '{\"assignee\":\"Order B\",\"assigneeEmail\":\"order.b@example.com\",\"assigneeId\":40,\"value\":\"true\",\"docIndex\":0,\"clientId\":\"b2\",\"signerName\":\"Order B\",\"signerEmail\":\"order.b@example.com\",\"signedAt\":\"2026-09-16T18:58:17.383Z\"}'),
(241, 43, 40, 1, 'Signature', 'Signature', NULL, 1, 60, 420, 150, 40, '{\"assignee\":\"Order B\",\"assigneeEmail\":\"order.b@example.com\",\"assigneeId\":40,\"value\":\"Signature\",\"docIndex\":1,\"clientId\":\"b3\",\"signatureImage\":\"Order Bee\",\"signatureStyle\":\"font-signature-1\",\"signerName\":\"Order B\",\"signerEmail\":\"order.b@example.com\",\"signedAt\":\"2026-09-16T18:58:17.383Z\"}'),
(242, 43, 39, 1, 'Sign date', 'Sign date', NULL, 1, 60, 420, 150, 40, '{\"assignee\":\"Vimal Chavda\",\"assigneeEmail\":\"vimal@bexcodeservices.com\",\"assigneeId\":39,\"value\":\"Sep 17, 2026\",\"docIndex\":1,\"clientId\":\"a3\",\"signerName\":\"Vimal Chavda\",\"signerEmail\":\"vimal@bexcodeservices.com\",\"signedAt\":\"2026-09-16T18:58:16.116Z\"}');
INSERT INTO `document_fields` (`id`, `document_id`, `recipient_id`, `page_number`, `field_type`, `label`, `description`, `is_required`, `pos_x`, `pos_y`, `width`, `height`, `options`) VALUES
(243, 43, 40, 1, 'Stamp', 'Stamp', NULL, 1, 60, 420, 150, 40, '{\"assignee\":\"Order B\",\"assigneeEmail\":\"order.b@example.com\",\"assigneeId\":40,\"value\":\"STAMP\",\"stampImage\":\"data:image/png;base64,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\",\"docIndex\":1,\"clientId\":\"b4\",\"signerName\":\"Order B\",\"signerEmail\":\"order.b@example.com\",\"signedAt\":\"2026-09-16T18:58:17.383Z\"}'),
(251, 45, 43, 1, 'Signature', 'Signature', NULL, 1, 60, 420, 150, 40, '{\"assignee\":\"Vimal Chavda\",\"assigneeEmail\":\"vimal@bexcodeservices.com\",\"assigneeId\":43,\"value\":\"Signature\",\"docIndex\":0,\"clientId\":\"a1\"}'),
(252, 45, 43, 1, 'Company', 'Company', NULL, 1, 60, 420, 150, 40, '{\"assignee\":\"Vimal Chavda\",\"assigneeEmail\":\"vimal@bexcodeservices.com\",\"assigneeId\":43,\"value\":\"Company\",\"docIndex\":0,\"clientId\":\"a2\"}'),
(253, 45, 44, 1, 'Full name', 'Full name', NULL, 1, 60, 420, 150, 40, '{\"assignee\":\"Order B\",\"assigneeEmail\":\"order.b@example.com\",\"assigneeId\":44,\"value\":\"Order B\",\"docIndex\":0,\"clientId\":\"b1\"}'),
(254, 45, 44, 1, 'Checkbox', 'Checkbox', NULL, 1, 60, 420, 150, 40, '{\"assignee\":\"Order B\",\"assigneeEmail\":\"order.b@example.com\",\"assigneeId\":44,\"value\":\"true\",\"docIndex\":0,\"clientId\":\"b2\"}'),
(255, 45, 44, 1, 'Signature', 'Signature', NULL, 1, 60, 420, 150, 40, '{\"assignee\":\"Order B\",\"assigneeEmail\":\"order.b@example.com\",\"assigneeId\":44,\"value\":\"Signature\",\"docIndex\":1,\"clientId\":\"b3\"}'),
(256, 45, 43, 1, 'Sign date', 'Sign date', NULL, 1, 60, 420, 150, 40, '{\"assignee\":\"Vimal Chavda\",\"assigneeEmail\":\"vimal@bexcodeservices.com\",\"assigneeId\":43,\"docIndex\":1,\"clientId\":\"a3\"}'),
(257, 45, 44, 1, 'Stamp', 'Stamp', NULL, 1, 60, 420, 150, 40, '{\"assignee\":\"Order B\",\"assigneeEmail\":\"order.b@example.com\",\"assigneeId\":44,\"value\":\"Stamp\",\"stampImage\":\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAbgAAACMCAYAAAAOVry8AAAQAElEQVR4AeydeYwkV33Hf7+a2Xuna3Z3tmvWHD7AeLp68Y0dE0JsRHCsKI6BTSAYRTnhD4MDlpIgZBJwZFmyIqwEI5EoiYLMFVvYcYQCAYJXxDjY2Fpsdqp3ScAH9nq617s73XvMeme6Xn7Vs1X9qqd6pru6uru6+1uq1/V7r97xe5/XU995dbVBWEAABEAABEBgCAlA4IZwUNElEAABEAABIggcvgXxCaAkCIAACKSYAAQuxYMD10AABEAABOITgMDFZ4eSIAAC8QmgJAh0nQAEruuI0QAIgAAIgEA/CEDg+kEdbYIACIAACMQn0GJJCFyLoJANBEAABEBgsAhA4AZrvOAtCIAACIBAiwQgcC2CGq1s6C0IgAAIDD4BCNzgjyF6AAIgAAIgEEEAAhcBBUkgAALxCaAkCKSFAAQuLSMBP0AABEAABBIlAIFLFCcqAwEQAAEQiE8g2ZIQuGR5ojYQAAEQAIGUEIDApWQg4AYIgAAIgECyBCBwyfJMe23wDwRAAARGhgAEbmSGGh0FARAAgdEiAIHrwXhPTs+cZ1r2s5NW7gc9aA5NgEB3CKBWEBgwAhC4HgyY6xq/L82cp4jfKmJ3rdhYQQAEQAAEukzA6HL9qB4EQAAEQAAE+kIAAtcX7GgUBEAABECg2wQgcN0mjPpBAARAAAT6QgAC1xfsyTeKGkEABEAABMIEIHBhHoiBAAiAAAgMCQEIXC8GkunCXjSDNkAgHgGUAoHhJACB68G4MqlzgmYUXxrYMEAABEAABLpGAALXNbSoGARAAASGn0CaewiBS/PowDcQAAEQAIHYBCBwsdGhIAiAAAiAQJoJQODSPDqebwggAAIgAAKxCEDgYmFDIRAAARAAgbQTgMClfYTgHwjEJ4CSIDDSBCBwPRh+pSh4TMBVNNGDJvvWRCabc03LVhkr93jfnEDDIAACICAEIHACodsrM6332zCILN8etq0pwsay1Pql6KraFh8gAAKDSWAIvJbj7RD0Al3oCoHJnfZlppV/0LTsu9ZqQPKoUB7mM6E4IiAAAiDQYwIQuB4DH6jmWP0RkXq3+PwJ03rzBbKNXBvFTclSKTobIjMjEQRAAAR6RAAC1yPQK5tJf4pivsj30lBqq2/r20hxKxXwvdIhwQYBEOgLARyI+oJ9QBpVNON7usRLr/dtf5vJ5kKnJWXiRhWIm48HWxAAgT4TgMD1eQBS3TzX7/hkpvNIW0TcqswcpJwVt3pCsAdGNwigThAAgbUJQODWZjTKOQLBMlxjgw8ik80fY+bguwNx88lgCwIgkCYCwUEqTU7Bl/QSkGtuX2ZWk7qHcloyEEI9HTYIgEAaCYyOTxC40Rnrjns6OXmpJ2wf0CsqFx2Imw4ENgiAQGoIQOB6MBRK8Sa/GcV1208blK3acOaY7ivETacBGwRAIG0EIHDJj8iKGg2mLfVEFYhdPS21VvAGFsX0N7qX5eKh0E0n+j7YIAACIJAGAhC4HoyCIgpu0CDi/TQwi1oX5aqh1LeJ5p+P2oc0EAABEEgLAQhcb0ZizG+Gq8Zjvp3+LQd+B76yOnKsVLg+iMNIlgBqAwEQSIwABC4xlKtWFNyIMf/K/r2r5kzxTqVosTxXmEqxi3ANBEAABAICEDhBMbHTXvSCmN1aA4HrVgNJ17tjx4VXN9ZZKTnBNbnGfYiDAAj0nQAcaCAw8gI3kc2dMgwa94JnE5YagcXxsdDjALVEfIAACIDAABEYeYGTqVVwV6NuJzaGWy/OanUpzU61ycQrZnCpdhjOgQAIgEADgZEXuAYeq0bj7Mxsqb6jXk65dTsZa+vO3U+blq0y2VzCdXPoMQClVDUZj1ELCIAACPSGAASuy5xZqSvrTfBS3e7c2r7T/sMxw73Yq4ll8YTOsxMK2/V6to5vzuhx2CAAAiCQdgIQuC6PELMKflONiU4n1dz2Xflfrxr0T431JTiTCz0icOjQU6ca20K8HQLICwIg0GsCELguE1eKX+s3oUid8O1Ot1VXfTOqDpnIcUIiF3w35PTkwFw7jGKCNBAAgdEkEBzERrP7tV4HB28Rh1pCwh/158YUHUmi7sZTkUrRCV2EpB88kc0lNluUy28/ScJv1AECIBCPAErFIzDyAifqdiYeutZKKVaBwCk2Op7BZabs5/SWlXLdSsmZqJQKobE0mLXXg+kl1rYzVq6k5zJ4/CU9DhsEQAAEBoFA6KA4CA4n7SNHXMdKsg2mutAw0SOd1s1jdK5eR6V0ILhW1vh2/9inKhXt1NsQW1yXT6wgAAIgMEAERl7gKnOFW0gbMJm9PKtFkzADcSgXZ2/vpMKMNVPUyytXhWZz3j45XRncDOKdqtwylfszL73DoDosj+IgAAIg0HMCIy9wK4grev2KtJQkMBn6Q+NUOVw4nxqWSsnRfpqHaHyM727I0koUgtYKJeQBARBINQEj1d71x7lgxtVp8xPT+T/X6uhINBpPN8q1t+Na3SHTZfXfesKEZTt6HHaiBFAZCIBASglA4GRglCyyqa3eab2akcCHodSeoBqmxcBu09g+lf9Yo19y7a3pg9fH5wpvly4FgiqDnGuzyXB2g6SKcBJiIAACIJB2Ajhw1UaIm86Garvjf7wxKKroWGC3aSwZ7mf1IktL7lE9HmVXGu6qnMjasR8bkOt6eE1XFGSkgUCnBFC+qwQgcIL31NGt75ZNF1aeqFeqYj1LNjGVf7Rx9nbyyIEd9XqbWzKLC4TJYIr92MDCxpOfat4K9oAACIBAOgkY6XSrt14tLT3xPb3FzHTuST0e31ZjfllF6p99u50tG+5b28mv55VZ3Lgeb7yOp+/TbWaq6PGtpzffoMdhgwAIgMAgEBhygYs5BC5fErNkY7HghpVK8cBXG3e2EmdZWsnXLI8Ia/DYg1TFO3bkbmmW109nFT5lW1X8aX9fv7Zbp/O2md39hn61j3ZBAAQGjwAE7uyYyem8s5a3qc+8vFicsOGC3IVxyiVdplIsXKDXuTTO9+rxKFsx79LTmWnctGwlwc1YuYWMZc+aWfuhULDyX53M5u5tJWSyuU9NWrmPNQumNfOJyWz+Lyct+0umZf/YtPJLY0rNErv/Nzk9c63uG2wQAAEQaEYAAlcnE9x1yLLUk+NZG06Qft0q1m+1TeycSeTnddT6pY/ovRCBWcOfpgLPTLyRiWxiuikUSL1fhPGWVgIz36GI72kWiIy7FKvPKKKbiUhm03V/lGu8SdJ6sqIREACBwSYAgfPHj/lF30xiy2y8Tasn1h2MhmGMaXXENiu/+OnnZYYqerFchQgMm9P2C8uxFZ9b9RSlKBGR1ets31bPEKmviS+fKZecf2i/PEqAAAiMIgEI3NlRrxTz5581E9q401pFL2t2X8xKw2MDpOh1U9bFNzY6k8naD+hplZKzznvHpRcUqXtk3wuyPU1KHZc65v0gaa+ICD3XSlCKHpV8e1cLIsi/xy5dvmVs05ZysXCJhN8VXz4t7WMFgQEgABfTQAACF4zCA8Et9V6SaeUe9LbxA2/0y8oBPfRmET99te1WayZ0Z+dqeVvdd2bM/aied5GWHtbjNZspuMYlfoceTpfrebeVi865st1ULhUy5ZKzzQ+StrNcLJzfShCh+hXJd91qoVIq3Dd/2Nl36NBTwbs1CQsIgAAItEEAAtcElqv4N5rsajWZ/YyVbdU7fLvVLbv89lbztppv4dCBe92G36RrvB4nTgfCbDD9b6t1Ix8IgAAIpI3AoApcVzjKabHgOpUc3Ncn1sjBg8Gt+onVGbOi4yVnSu+ndz0uY9kvR1V3YuPJP45KRxoIgAAIDAIBCJw2Smzwj7VobHNr1v5Q7MI9KCin/0LjzkTTW3fu/h2it4QfKXj++f/pgTtoAgRAAAS6QiB0oOtKCwNUaXnOuVx317RyT+vxVm2BequWd41b8rWcPTSXxpfu0psbM9x/nbROrrwmp2caFhv9AAEQGAkCciweiX7G6qRS9OZYBYku0sp160XOWhPtmydf+uknpX8h30SJg4fTZV/oBpP2W0AJEAABEOgvAQhcA39XqQU/ybs+5dvtbJkpeAekXNT7Yjtle5m3UnJCP7kjpyqDFzIzcyKna3vZH7QFAj0ggCYGiAAErmGwjpcKm/WkiV0zt+nxtexzzrkiVL5SdP50rTJ93h8Iuu5HuTj7Tj0OGwRAAAQGjQAEbo0R4yrfvUaW0O6TSwuPhhJSHikXnZAga+6GflFAS4fZBwIZK/dZM2v/QsIxCQ+Y0/Zv98ENNAkCA0UgdQKXBnoNt9GPteOTnJLcreUPXePS0lNl6v31HGuMe2kIvSewLGq5F03LVkz8cWJ6rYRJCXuUS/nee4QWQWCwCEDgIsaLDf5+RHJLScy0rp6R76/byVjdEB93nft+3TtD0d/qcdi9IyCzsy9IOFYXNX7NytbVYTLo8ZXpSAEBENAJQOB0Gmft8pwTvK7KS8pk7VZnYiGech0r8Qelq1U17/mUZDjx0sH75VQl+2H+cOHjSdbfu7oGsyUzu/tdImg/k+AS04clTEb05Iik3S9TuavLxUK2Mud8U+JYQQAEViEQOiCvkm/kdoVnSmpLKwDkAPVYK/k6yXPyyIHtnZRH2XQQ2D59SX7SsvfLd0ZEzf1P8cp7yJ5lG6yKyHvDzFd4nC4rF50pCe8TYXsiyAADBEBgVQIQuKZ4+KS/i2Xx7dW2ckC6TNsflNfSYI4wgampiyZE0J6QsFhVi/vl++JdRwuJGhHLDF39Y5U5Xyk654io3Tz/koNHNqj7C1oYPgIQuCZjWik5E/qujGU7ejzKZqLg/ZWK+N+j8nSSpmTppDzK9oeACNp/STi1ODbm3Zn6FvEieE5SbCJFi6TUU6Tc6+W09rZysfAnJ+Zm1/y+1criAwRAoCkBCFxTNA07lJppSFk1WinOfmDVDDF2uqQeilEMRfpAQK7b3ieidlSCkubfIWGTBH1VzPQCGer2cslZXy4VriyXDnxbzwAbBECgMwK9E7jO/OxLaZkweQenWtssS81o8mFauUea7Eos+UTpwHsTqwwVJUzgClPE7AsSXpbgMtMHpYFtEsKronn5Un2lXHSM+Tnn3PLLhTvDGRADARBIigAEbjWSzN/Qd8uBq+lt/4r4mnre+uu+6mmwhonA5mn7BtPKf0+Cd0t/1bQW5NoZfVj6OC1BzlbLZ319VSn6gUzZriqXnG1ybe3m+i5YIAAC3SIAgVuFrByIbtR3y4xujx7XbTmiBe9xFLHr+FSTInVUr3/E7b5337Rm7jSz9gHTsk9LUOsU/QeRuk6Cd0t/1N+RK07/TL4Xt8psbaNc031bZW72R5KGFQRAoEcEov4we9T0YDQj/3mf8D1lWWjd1Vf48WZbEcabmu1rNf3E4QNZEVRvJe/DdcWTVgsjX0cEtm/P25OW/W8iZCXTyi+Zlq2IjE8Sk/crEcE/MhGNKCY6JeHLImpjEt44X3Q+F5EPSSAAk5TnhAAACBRJREFUAj0gAIFbA7L85x2+m3JbZcV/4XIA/O4a1cTaXSkVDAkswTh+uICxikVx7UIZy/6ozM72iaidkrFU1XVqVhTtt6TkTpmhjcm2yaqqsqMkgvbwepcuF0EzRNC2SPCuv8kurKkgACdGlgAOmi0MvcygvNNNtZwyiZPjWc3UPy71I5LXO+j5UWzTR2DzZNb+kgjZnGnlarMzJvo7mZ1dKqLWeKej7n1tdiZ5ZhXzX4mYcblYGC8XHUsE7abDh519embYIAAC/ScAgWthDGQGFfovPpPNhURMTh7Wf1eNeamFKpGlhwREyH5iTtuviqi5Ek4qJu8mD4uIQ+NKoaU2OzvMpL4xtuj+sghZbXYmp593y7W0O0JZEQEBEEglgQQELpX9StwpmZnJP+/L1TJziBszBQ/uio03mCxj6uunuTO/R4StdsqRiHeTIu8hfJmsUdQimkcLMsAFRXyniJk/O8vOFwu/efToga6/gi3KKaSBAAh0RiB0oO6squEuLar1Xr2HGcte0OL1A6dL3ktxtV0we0nAtHI/lFmaS4Z6gIibnHKszc5eEdH7FleN60TQvNnZZpmd2ZXi7O2EBQRAYCgIQOBaHMZqqRB6i4go2saoooro51HpSIsmkETq1K7LrhRRq0gQ/Hy11CnDI5/h9QQpdbeImT8721kuOTfMv7J/bzgbYiAAAsNCAALXzkiyelLPLrOFF/X4ss04nbUMouufwv87Imruovuqd2dr6G7Xs42L4FFhWdSciXKp8Bdn07EBARAYAQIQuDYGuTxX8F6Uq5VY+WOUlZL5RS0DzMQJbPNeiXX2HY/8Tqk+Yram5HqaukeEzZBgSx6sQ0kAnQKB1QlA4Fbns2KvUnRcT5zM5r+ux4keez4cRywJAua0/YBZe+h6l/dKrJXveCS5okbqWRE07xSkXE8r3JZEu6gDBEBgcAlA4Nocu0rJqT8SIGUVq/fIBmuXCJiWXZSgRL72iIaNrWiGyXvP47+IsMlsreD9aOiKLEgAARAYTQKrCdxoEmmh10rV7sJrISeyxCEwYdl/LzM277k17xpaNrIOxS+Wj294TXnO8d7z+AeReZAIAiAw0gQgcDGGv1IqBM+9NRQPnb5s2IfoGgRMK/eszNZc+VJ+SGZs3nNrjSWWiNWDMlvjcmn2dXRq36HGDIiDAAiAgE9AjiW+iW07BGQW15j9lBx4Q6cvGzOMVLzFzmas/F+bVs5/IPs8KRZx0wiVNtL4NcJ3XXmuEHoeUfJjBQEQAIFIAhC4SCxrJ8osLjgQy3m003Lw3bJ2KeTwCchMbZ+EKpO6naIfyHblmtt3hStLsIrFZ35IWEAABECgDQIQuDZgNWaVA6938OVK0WnyxozGEqMdz2TtD8psbV6ETf4nIO8F1VHfv+OkeI+wHSsXC79GWEaRAPoMAokQiDrAJFIxKgGBqV0XX56x7FkRtjOeqDHTfURs0srFE7wflYuO9w9DRq6vNTx6sbIAUkAABEBgLQIQuLUIYX/rBC644E2mlX/aF7RFd+kpOY9ri7Cti6zEu8Wf+SMibIaEqyLzIBEEQAAE2iGg5YXAaTBgtkvg2ikzaz8ps7TaLf3myY0H5brZxU0FLahePSeCxmXvFv+52c8HyTBAAARAIEECELgEYY5AVetNy35MBO20bJVplQ4T0xUyS4u6pT/AIecfXxXh+46ImlxX805DFs4PdsIAARAAgS4RgMB1CeywVGtO5x8RQVtYFjT7VSK6RgRtw2r9E0E7Q4q+L4I2LsG7CWdjuVh4l5RxJWAFARAAgZ4QgMD1BPPgNCKC9i0Rs5MSZIZmK1LqWhG0yJ8G8nulFC2K/Xi5mF1XLjqeoG0ol5xflbSqBKwgAAIg0BcCELi+YE9Poxkr/7CI2QkJvqBdL95tltB0VZ6gKdpX3kEbaoJWctbL9peI9i41LYQdIEBEgAACvSQAgesl7RS0ZVr5r5mW7f04qCtbxaRuFLfWeEidqzKLmy1vOrVJhIwrnqCVnMvJcc5IWawgAAIgkEoCELhUDkuyTpnZ/NdFzGqCRqTeJ7V7Pw4qmiVW5MpVOTV58Ewl+zpP0MrF2fH5orObnnvudGR2JIIACIBA1wm03wAErn1mg1di+Sd9Vhc0op8vbK5e4gtauVSYWVjY++LgdRYegwAIgMAyAQjcModR+/TuZnyB2bguELSi84Yzzx58ZtRAoL8gAALDSwACN7xjG/RMLrR9Tik6OK7Ue5YFzfGeRzt3fm7/3iATEUwQAAEQGCoCELihGs7ozlTmnFsrJWfmSKnwUHQOpIIACIDA8BGAwA3fmKJHINB7AmgRBFJIAAKXwkGBSyAAAiAAAp0TgMB1zhA1gAAIgAAIxCfQtZIQuK6hRcUgAAIgAAL9JACB6yd9tA0CIAACINA1AhC4rqFNT8XwBARAAARGkQAEbhRHHX0GARAAgREgAIEbgUFGF0EgPgGUBIHBJQCBG9yxg+cgAAIgAAKrEIDArQIHu0AABEAABOIT6HdJCFy/RwDtgwAIgAAIdIUABK4rWFEpCIAACIBAvwlA4Po9Ap20j7IgAAIgAAJNCUDgmqLBDhAAARAAgUEmAIEb5NGD7yAQnwBKgsDQE4DADf0Qo4MgAAIgMJoEIHCjOe7oNQiAAAjEJzAgJSFwAzJQcBMEQAAEQKA9AhC49nghNwiAAAiAwIAQgMClcqDgFAiAAAiAQKcEIHCdEkR5EAABEACBVBKAwKVyWOAUCMQngJIgAALLBP4fAAD//zugpCkAAAAGSURBVAMAA0Rac1ocdMQAAAAASUVORK5CYII=\",\"docIndex\":1,\"clientId\":\"b4\"}'),
(258, 44, 41, 1, 'Signature', 'Signature', NULL, 1, 60, 420, 150, 40, '{\"assignee\":\"Vimal Chavda\",\"assigneeEmail\":\"vimal@bexcodeservices.com\",\"assigneeId\":41,\"value\":\"Signature\",\"docIndex\":0,\"clientId\":\"a1\",\"signatureImage\":\"data:image/png;base64,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\",\"signatureStyle\":\"font-signature-1\",\"signerName\":\"Vimal Chavda\",\"signerEmail\":\"vimal@bexcodeservices.com\",\"signedAt\":\"2026-09-16T19:00:54.810Z\"}'),
(259, 44, 41, 1, 'Company', 'Company', NULL, 1, 60, 420, 150, 40, '{\"assignee\":\"Vimal Chavda\",\"assigneeEmail\":\"vimal@bexcodeservices.com\",\"assigneeId\":41,\"value\":\"Bexcode Services\",\"docIndex\":0,\"clientId\":\"a2\",\"signerName\":\"Vimal Chavda\",\"signerEmail\":\"vimal@bexcodeservices.com\",\"signedAt\":\"2026-09-16T19:00:54.810Z\"}'),
(260, 44, 42, 1, 'Full name', 'Full name', NULL, 1, 60, 420, 150, 40, '{\"assignee\":\"Order B\",\"assigneeEmail\":\"order.b@example.com\",\"assigneeId\":42,\"value\":\"Order B\",\"docIndex\":0,\"clientId\":\"b1\"}'),
(261, 44, 42, 1, 'Checkbox', 'Checkbox', NULL, 1, 60, 420, 150, 40, '{\"assignee\":\"Order B\",\"assigneeEmail\":\"order.b@example.com\",\"assigneeId\":42,\"value\":\"true\",\"docIndex\":0,\"clientId\":\"b2\"}'),
(262, 44, 42, 1, 'Signature', 'Signature', NULL, 1, 60, 420, 150, 40, '{\"assignee\":\"Order B\",\"assigneeEmail\":\"order.b@example.com\",\"assigneeId\":42,\"value\":\"Signature\",\"docIndex\":1,\"clientId\":\"b3\"}'),
(263, 44, 41, 1, 'Sign date', 'Sign date', NULL, 1, 60, 420, 150, 40, '{\"assignee\":\"Vimal Chavda\",\"assigneeEmail\":\"vimal@bexcodeservices.com\",\"assigneeId\":41,\"docIndex\":1,\"clientId\":\"a3\",\"value\":\"Sep 17, 2026\",\"signerName\":\"Vimal Chavda\",\"signerEmail\":\"vimal@bexcodeservices.com\",\"signedAt\":\"2026-09-16T19:00:54.810Z\"}'),
(264, 44, 42, 1, 'Stamp', 'Stamp', NULL, 1, 60, 420, 150, 40, '{\"assignee\":\"Order B\",\"assigneeEmail\":\"order.b@example.com\",\"assigneeId\":42,\"value\":\"Stamp\",\"stampImage\":\"data:image/png;base64,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\",\"docIndex\":1,\"clientId\":\"b4\"}'),
(265, 46, 45, 1, 'Signature', 'Signature', NULL, 1, 60, 420, 150, 40, '{\"assignee\":\"Vimal Chavda\",\"assigneeEmail\":\"vimal@bexcodeservices.com\",\"assigneeId\":45,\"value\":\"Signature\",\"docIndex\":0,\"clientId\":\"a1\"}'),
(266, 46, 45, 1, 'Company', 'Company', NULL, 1, 60, 420, 150, 40, '{\"assignee\":\"Vimal Chavda\",\"assigneeEmail\":\"vimal@bexcodeservices.com\",\"assigneeId\":45,\"value\":\"Company\",\"docIndex\":0,\"clientId\":\"a2\"}'),
(267, 46, 46, 1, 'Full name', 'Full name', NULL, 1, 60, 420, 150, 40, '{\"assignee\":\"Order B\",\"assigneeEmail\":\"order.b@example.com\",\"assigneeId\":46,\"value\":\"Order B\",\"docIndex\":0,\"clientId\":\"b1\"}'),
(268, 46, 46, 1, 'Checkbox', 'Checkbox', NULL, 1, 60, 420, 150, 40, '{\"assignee\":\"Order B\",\"assigneeEmail\":\"order.b@example.com\",\"assigneeId\":46,\"value\":\"true\",\"docIndex\":0,\"clientId\":\"b2\"}'),
(269, 46, 46, 1, 'Signature', 'Signature', NULL, 1, 60, 420, 150, 40, '{\"assignee\":\"Order B\",\"assigneeEmail\":\"order.b@example.com\",\"assigneeId\":46,\"value\":\"Signature\",\"docIndex\":1,\"clientId\":\"b3\"}'),
(270, 46, 45, 1, 'Sign date', 'Sign date', NULL, 1, 60, 420, 150, 40, '{\"assignee\":\"Vimal Chavda\",\"assigneeEmail\":\"vimal@bexcodeservices.com\",\"assigneeId\":45,\"docIndex\":1,\"clientId\":\"a3\"}'),
(271, 46, 46, 1, 'Stamp', 'Stamp', NULL, 1, 60, 420, 150, 40, '{\"assignee\":\"Order B\",\"assigneeEmail\":\"order.b@example.com\",\"assigneeId\":46,\"value\":\"Stamp\",\"stampImage\":\"data:image/png;base64,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\",\"docIndex\":1,\"clientId\":\"b4\"}'),
(275, 47, NULL, 1, 'Signature', 'Signature', NULL, 1, 60, 533, 200, 70, '{\"value\":\"Signature\",\"docIndex\":0,\"assigneeId\":1,\"assignee\":\"Vimal Chavda\",\"assigneeEmail\":\"chavdavimaln@gmail.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"clientId\":1789585573703}'),
(276, 47, NULL, 1, 'Sign date', 'Sign date', NULL, 1, 60, 587, 160, 40, '{\"value\":\"Sign date\",\"docIndex\":0,\"assigneeId\":1,\"assignee\":\"Vimal Chavda\",\"assigneeEmail\":\"chavdavimaln@gmail.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"dateFormat\":\"MMM dd yyyy HH:mm z\",\"clientId\":1789585585807}');

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

--
-- Dumping data for table `document_field_values`
--

INSERT INTO `document_field_values` (`id`, `field_id`, `recipient_id`, `field_value`, `submitted_at`) VALUES
(24, 90, 20, 'Signed by Vimal Chavda', '2026-09-16 13:01:37'),
(25, 91, 21, 'vnc chavda', '2026-09-16 13:03:51'),
(26, 92, 21, 'Signed by vc', '2026-09-16 13:03:51'),
(34, 151, 26, 'Signed by Order B', '2026-09-16 17:15:06'),
(35, 156, 28, 'Signed by Order A', '2026-09-16 17:15:08'),
(36, 157, 29, 'Signed by Order B', '2026-09-16 17:15:08'),
(37, 226, 38, 'Bexcode Services', '2026-09-16 18:44:00'),
(38, 227, 38, 'true', '2026-09-16 18:44:00'),
(39, 237, 39, 'Signed by Vimal Chavda', '2026-09-16 18:58:16'),
(40, 238, 39, 'Bexcode Services', '2026-09-16 18:58:16'),
(41, 242, 39, 'Sep 17, 2026', '2026-09-16 18:58:16'),
(42, 239, 40, 'Order B', '2026-09-16 18:58:17'),
(43, 240, 40, 'true', '2026-09-16 18:58:17'),
(44, 241, 40, 'Signed by Order B', '2026-09-16 18:58:17'),
(45, 243, 40, 'STAMP', '2026-09-16 18:58:18'),
(46, 258, 41, 'Signed by Vimal Chavda', '2026-09-16 19:00:54'),
(47, 259, 41, 'Bexcode Services', '2026-09-16 19:00:54'),
(48, 263, 41, 'Sep 17, 2026', '2026-09-16 19:00:54'),
(49, 223, 37, 'Signed by Vimal Chavda', '2026-09-16 19:07:25'),
(50, 224, 37, 'hghg', '2026-09-16 19:07:25'),
(51, 225, 37, 'Sep 17, 2026', '2026-09-16 19:07:25'),
(52, 228, 37, 'Sep 17, 2026', '2026-09-16 19:07:25'),
(53, 229, 37, 'Signed by Vimal Chavda', '2026-09-16 19:07:25');

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
  `document_text` longtext DEFAULT NULL,
  `signed_file_path` varchar(255) DEFAULT NULL,
  `sort_order` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `document_files`
--

INSERT INTO `document_files` (`id`, `document_id`, `file_name`, `file_path`, `file_size`, `file_type`, `uploaded_at`, `document_text`, `signed_file_path`, `sort_order`) VALUES
(9, 24, 'My doc vimal 2.pdf', '/uploads/sample.pdf', 1024, 'pdf', '2026-09-04 08:37:21', 'check the document for signature', NULL, 0),
(10, 24, 'second document.pdf', '/uploads/sample.pdf', 1024, 'pdf', '2026-09-04 08:37:21', 'check the document for signature', NULL, 0),
(30, 34, 'Blank Agreement Document.pdf', '/uploads/sample.pdf', NULL, 'pdf', '2026-09-16 12:54:24', 'MUTUAL BUSINESS AGREEMENT AND CONSENT\n\nThis Document represents a formal, legally binding agreement executed between Bexcode Services and the designated Signer.\n\n1. SCOPE AND PURPOSE\nThe undersigned parties hereby ratify the terms, covenants, and conditions specified within this document and agree to the cryptographic authentication protocols implemented herein.\n\n2. ELECTRONIC SIGNATURE LEGAL VALIDITY\nBoth parties expressly consent to the execution of this document via BexSign electronic signatures and acknowledge that digital signatures possess the same legal force as handwritten signatures.\n\n3. RECORD KEEPING AND AUDIT TRAIL\nA comprehensive digital certificate and time-stamped audit trail will be generated upon completion, verifying signer identity, IP address, and document integrity.\n\n4. ACKNOWLEDGMENT AND EXECUTION\nPlease review the contents of this document carefully before affixing your signature in the designated field below.', '/uploads/completed/34/01-Blank-Agreement-Document.pdf', 0),
(31, 35, 'My first document', '/uploads/sample.pdf', NULL, 'pdf', '2026-09-16 13:19:02', '<p style=\"margin-bottom: 12px;\"><strong>1 MUTUAL BUSINESS AGREEMENT AND CONSENT</strong></p><p style=\"margin-bottom: 12px; line-height: 1.6;\">This Document represents a formal, legally binding agreement executed between Bexcode Services and the designated Signer.</p><p style=\"margin-bottom: 12px;\"><strong>1. SCOPE AND PURPOSE<br>The undersigned parties hereby ratify the terms, covenants, and conditions specified within this document and agree to the cryptographic authentication protocols implemented herein.</strong></p><p style=\"margin-bottom: 12px;\"><strong>2. ELECTRONIC SIGNATURE LEGAL VALIDITY<br>Both parties expressly consent to the execution of this document via BexSign electronic signatures and acknowledge that digital signatures possess the same legal force as handwritten signatures.</strong></p><p style=\"margin-bottom: 12px;\"><strong>3. RECORD KEEPING AND AUDIT TRAIL<br>A comprehensive digital certificate and time-stamped audit trail will be generated upon completion, verifying signer identity, IP address, and document integrity.</strong></p><p style=\"margin-bottom: 12px;\"><strong>4. ACKNOWLEDGMENT AND EXECUTION<br>Please review the contents of this document carefully before affixing your signature in the designated field below.</strong></p>', '/uploads/completed/35/01-Blank-Agreement-Document.pdf', 0),
(32, 35, 'My second document 2', '/uploads/sample.pdf', NULL, 'pdf', '2026-09-16 15:05:51', 'MUTUAL BUSINESS AGREEMENT AND CONSENT\n\nThis Document represents a formal, legally binding agreement executed between Bexcode Services and the designated Signer.\n\n1. SCOPE AND PURPOSE\nThe undersigned parties hereby ratify the terms, covenants, and conditions specified within this document and agree to the cryptographic authentication protocols implemented herein.\n\n2. ELECTRONIC SIGNATURE LEGAL VALIDITY\nBoth parties expressly consent to the execution of this document via BexSign electronic signatures and acknowledge that digital signatures possess the same legal force as handwritten signatures.\n\n3. RECORD KEEPING AND AUDIT TRAIL\nA comprehensive digital certificate and time-stamped audit trail will be generated upon completion, verifying signer identity, IP address, and document integrity.\n\n4. ACKNOWLEDGMENT AND EXECUTION\nPlease review the contents of this document carefully before affixing your signature in the designated field below.', NULL, 1),
(33, 36, 'Verify resend completed.pdf', '/uploads/sample.pdf', NULL, 'pdf', '2026-09-16 17:15:01', 'VERIFY SIGNING ORDER\n\nTest request.', NULL, 0),
(34, 37, 'Verify changed order.pdf', '/uploads/sample.pdf', NULL, 'pdf', '2026-09-16 17:15:06', 'VERIFY SIGNING ORDER\n\nTest request.', NULL, 0),
(35, 38, 'Verify shared step.pdf', '/uploads/sample.pdf', NULL, 'pdf', '2026-09-16 17:15:07', 'VERIFY SIGNING ORDER\n\nTest request.', NULL, 0),
(36, 39, 'Verify all at once.pdf', '/uploads/sample.pdf', NULL, 'pdf', '2026-09-16 17:15:09', 'VERIFY SIGNING ORDER\n\nTest request.', NULL, 0),
(37, 40, 'Verify list order.pdf', '/uploads/sample.pdf', NULL, 'pdf', '2026-09-16 17:15:10', 'VERIFY SIGNING ORDER\n\nTest request.', NULL, 0),
(38, 41, 'doc 2', '/uploads/sample.pdf', NULL, 'pdf', '2026-09-16 17:29:52', 'MUTUAL BUSINESS AGREEMENT AND CONSENT\n\nThis Document represents a formal, legally binding agreement executed between Bexcode Services and the designated Signer.\n\n1. SCOPE AND PURPOSE\nThe undersigned parties hereby ratify the terms, covenants, and conditions specified within this document and agree to the cryptographic authentication protocols implemented herein.\n\n2. ELECTRONIC SIGNATURE LEGAL VALIDITY\nBoth parties expressly consent to the execution of this document via BexSign electronic signatures and acknowledge that digital signatures possess the same legal force as handwritten signatures.\n\n3. RECORD KEEPING AND AUDIT TRAIL\nA comprehensive digital certificate and time-stamped audit trail will be generated upon completion, verifying signer identity, IP address, and document integrity.\n\n4. ACKNOWLEDGMENT AND EXECUTION\nPlease review the contents of this document carefully before affixing your signature in the designated field below.', NULL, 0),
(39, 42, 'doc-2', '/uploads/sample.pdf', NULL, 'pdf', '2026-09-16 17:34:34', 'MUTUAL BUSINESS AGREEMENT AND CONSENT\n\nThis Document represents a formal, legally binding agreement executed between Bexcode Services and the designated Signer.\n\n1. SCOPE AND PURPOSE\nThe undersigned parties hereby ratify the terms, covenants, and conditions specified within this document and agree to the cryptographic authentication protocols implemented herein.\n\n2. ELECTRONIC SIGNATURE LEGAL VALIDITY\nBoth parties expressly consent to the execution of this document via BexSign electronic signatures and acknowledge that digital signatures possess the same legal force as handwritten signatures.\n\n3. RECORD KEEPING AND AUDIT TRAIL\nA comprehensive digital certificate and time-stamped audit trail will be generated upon completion, verifying signer identity, IP address, and document integrity.\n\n4. ACKNOWLEDGMENT AND EXECUTION\nPlease review the contents of this document carefully before affixing your signature in the designated field below.', '/uploads/completed/42/01-doc-2.pdf', 0),
(40, 42, 'doc-3', '/uploads/sample.pdf', NULL, 'pdf', '2026-09-16 17:35:17', 'MUTUAL BUSINESS AGREEMENT AND CONSENT\n\nThis Document represents a formal, legally binding agreement executed between Bexcode Services and the designated Signer.\n\n1. SCOPE AND PURPOSE\nThe undersigned parties hereby ratify the terms, covenants, and conditions specified within this document and agree to the cryptographic authentication protocols implemented herein.\n\n2. ELECTRONIC SIGNATURE LEGAL VALIDITY\nBoth parties expressly consent to the execution of this document via BexSign electronic signatures and acknowledge that digital signatures possess the same legal force as handwritten signatures.\n\n3. RECORD KEEPING AND AUDIT TRAIL\nA comprehensive digital certificate and time-stamped audit trail will be generated upon completion, verifying signer identity, IP address, and document integrity.\n\n4. ACKNOWLEDGMENT AND EXECUTION\nPlease review the contents of this document carefully before affixing your signature in the designated field below.', '/uploads/completed/42/02-doc-3.pdf', 1),
(41, 43, 'Verify multi A', '/uploads/sample.pdf', NULL, 'pdf', '2026-09-16 18:58:14', 'DOCUMENT A\n\nFirst document of the verification request.', '/uploads/completed/43/01-Verify-multi-A.pdf', 0),
(42, 43, 'Verify multi B', '/uploads/sample.pdf', NULL, 'pdf', '2026-09-16 18:58:14', 'DOCUMENT B\n\nSecond document of the verification request.', '/uploads/completed/43/02-Verify-multi-B.pdf', 1),
(43, 44, 'Verify multi A (Copy)', '/uploads/sample.pdf', NULL, 'pdf', '2026-09-16 18:58:20', 'DOCUMENT A\n\nFirst document of the verification request.', NULL, 0),
(44, 44, 'Verify multi B (Copy)', '/uploads/sample.pdf', NULL, 'pdf', '2026-09-16 18:58:20', 'DOCUMENT B\n\nSecond document of the verification request.', NULL, 1),
(45, 45, 'Verify multi A (Copy 2)', '/uploads/sample.pdf', NULL, 'pdf', '2026-09-16 18:58:21', 'DOCUMENT A\n\nFirst document of the verification request.', NULL, 0),
(46, 45, 'Verify multi B (Copy 2)', '/uploads/sample.pdf', NULL, 'pdf', '2026-09-16 18:58:21', 'DOCUMENT B\n\nSecond document of the verification request.', NULL, 1),
(47, 46, 'Verify multi A (Copy 3)', '/uploads/sample.pdf', NULL, 'pdf', '2026-09-16 19:01:38', 'DOCUMENT A\n\nFirst document of the verification request.', NULL, 0),
(48, 46, 'Verify multi B (Copy 3)', '/uploads/sample.pdf', NULL, 'pdf', '2026-09-16 19:01:38', 'DOCUMENT B\n\nSecond document of the verification request.', NULL, 1),
(49, 47, 'Document 1.pdf', '/uploads/sample.pdf', NULL, 'pdf', '2026-09-16 19:06:12', 'MUTUAL BUSINESS AGREEMENT AND CONSENT\n\nThis Document represents a formal, legally binding agreement executed between Bexcode Services and the designated Signer.\n\n1. SCOPE AND PURPOSE\nThe undersigned parties hereby ratify the terms, covenants, and conditions specified within this document and agree to the cryptographic authentication protocols implemented herein.\n\n2. ELECTRONIC SIGNATURE LEGAL VALIDITY\nBoth parties expressly consent to the execution of this document via BexSign electronic signatures and acknowledge that digital signatures possess the same legal force as handwritten signatures.\n\n3. RECORD KEEPING AND AUDIT TRAIL\nA comprehensive digital certificate and time-stamped audit trail will be generated upon completion, verifying signer identity, IP address, and document integrity.\n\n4. ACKNOWLEDGMENT AND EXECUTION\nPlease review the contents of this document carefully before affixing your signature in the designated field below.', NULL, 0);

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
(19, 24, 'BEX-DOC-2026-0024-E5JGIK41-LX89QGT3NHA4F9UDSZPQTX', 'BEX-DOC', 2026, 24, 'E5JGIK41-LX89QGT3NHA4F9UDSZPQTX', 'Vimal Chavda', 'vimal@bexcodeservices.com', 'font-signature-2', 'data:image/png;base64,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', 'Completed', '::1', 'SHA256-CERTIFIED-ELECTRONIC-RECORD', NULL, '2026-09-04 14:08:21', '2026-09-03 20:16:04', '2026-09-04 08:38:21'),
(21, 26, 'BEX-DOC-2026-0026-D0Z7KLHR-M4X0U23OHEQUFE5P658Q8Q', 'BEX-DOC', 2026, 26, 'D0Z7KLHR-M4X0U23OHEQUFE5P658Q8Q', 'Vimal Chavda', 'vimal@bexcodeservices.com', 'font-signature-2', 'data:image/png;base64,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', 'Completed', '::1', 'SHA256-CERTIFIED-ELECTRONIC-RECORD', NULL, '2026-09-04 14:21:13', '2026-09-04 08:49:33', '2026-09-04 08:51:13'),
(22, 166, 'BEX-DOC-2026-0166-TR823WG3-KU3Z2240SVC9YB4MHM537', 'BEX-DOC', 2026, 166, 'TR823WG3-KU3Z2240SVC9YB4MHM537', 'Vimal Chavda', 'vimal@bexcodeservices.com', 'font-signature-1', NULL, 'Draft', '223.181.69.208', 'SHA256-CERTIFIED-ELECTRONIC-RECORD', NULL, NULL, '2026-09-04 17:42:50', '2026-09-04 17:42:50'),
(31, 34, 'BEX-DOC-2026-0034-OUEP0CO9-46Y6RX8KV1PXD47YGRDVC', 'BEX-DOC', 2026, 34, 'OUEP0CO9-46Y6RX8KV1PXD47YGRDVC', 'vc', 'chavdavimaln@gmail.com', 'font-signature-1', 'vc', 'Completed', '::1', 'SHA256-CERTIFIED-ELECTRONIC-RECORD', NULL, '2026-09-16 18:33:51', '2026-09-16 12:54:24', '2026-09-16 13:03:51'),
(32, 35, 'BEX-DOC-2026-0035-RI6Q2914-E4K0JNKDF381717U9NVSTI', 'BEX-DOC', 2026, 35, 'RI6Q2914-E4K0JNKDF381717U9NVSTI', 'vc', 'chavdavimaln@gmail.com', 'font-signature-1', 'vc', 'Completed', '::1', 'SHA256-CERTIFIED-ELECTRONIC-RECORD', NULL, '2026-09-16 18:56:32', '2026-09-16 13:19:02', '2026-09-16 13:26:32'),
(33, 1, 'BEX-DOC-2026-0001-361682B4-ERZWVA2U19FQKOU0LTHEPYMCRKHTZR2MFDEBT65NAG', 'BEX-DOC', 2026, 1, '361682B4-ERZWVA2U19FQKOU0LTHEPYMCRKHTZR2MFDEBT65NAG', 'Vimal Chavda', 'vimal@bexcodeservices.com', 'font-signature-1', NULL, 'Draft', '223.181.69.208', 'SHA256-CERTIFIED-ELECTRONIC-RECORD', NULL, NULL, '2026-09-16 13:32:58', '2026-09-16 13:32:58'),
(34, 36, 'BEX-DOC-2026-0036-YAUCPFDW-5RUM8U4IGLMFXORB5IM5HM', 'BEX-DOC', 2026, 36, 'YAUCPFDW-5RUM8U4IGLMFXORB5IM5HM', 'Order A', 'order.a@example.com', 'font-signature-1', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==', 'In Progress', '::1', 'SHA256-CERTIFIED-ELECTRONIC-RECORD', NULL, '2026-09-16 22:45:05', '2026-09-16 17:15:01', '2026-09-16 17:15:05'),
(35, 37, 'BEX-DOC-2026-0037-L9X67KSJ-GDLV8IDN43VSGQAEUUHE', 'BEX-DOC', 2026, 37, 'L9X67KSJ-GDLV8IDN43VSGQAEUUHE', 'Order B', 'order.b@example.com', 'font-signature-1', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==', 'In Progress', '::1', 'SHA256-CERTIFIED-ELECTRONIC-RECORD', NULL, '2026-09-16 22:45:07', '2026-09-16 17:15:06', '2026-09-16 17:15:07'),
(36, 38, 'BEX-DOC-2026-0038-JRZ9P5A2-R722S7Y5WSHFNLL2195RRL', 'BEX-DOC', 2026, 38, 'JRZ9P5A2-R722S7Y5WSHFNLL2195RRL', 'Order B', 'order.b@example.com', 'font-signature-1', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==', 'In Progress', '::1', 'SHA256-CERTIFIED-ELECTRONIC-RECORD', NULL, '2026-09-16 22:45:08', '2026-09-16 17:15:07', '2026-09-16 17:15:08'),
(37, 39, 'BEX-DOC-2026-0039-OYLEXCKK-7K8YJCOCOJRUBG52EA4728', 'BEX-DOC', 2026, 39, 'OYLEXCKK-7K8YJCOCOJRUBG52EA4728', 'Order A', 'order.a@example.com', 'font-signature-1', NULL, 'Draft', '223.181.69.208', 'SHA256-CERTIFIED-ELECTRONIC-RECORD', NULL, NULL, '2026-09-16 17:15:09', '2026-09-16 17:15:09'),
(38, 40, 'BEX-DOC-2026-0040-E66PNQBE-S70LKP02IK4Z7592HVNTD', 'BEX-DOC', 2026, 40, 'E66PNQBE-S70LKP02IK4Z7592HVNTD', 'Order C', 'order.c@example.com', 'font-signature-1', NULL, 'Draft', '223.181.69.208', 'SHA256-CERTIFIED-ELECTRONIC-RECORD', NULL, NULL, '2026-09-16 17:15:10', '2026-09-16 17:15:10'),
(39, 41, 'BEX-DOC-2026-0041-KATW7LGG-YUA0T8L8XRKXY7DG6G7LI', 'BEX-DOC', 2026, 41, 'KATW7LGG-YUA0T8L8XRKXY7DG6G7LI', 'Vimal Chavda', 'vimal@bexcodeservices.com', 'font-signature-1', NULL, 'Draft', '223.181.69.208', 'SHA256-CERTIFIED-ELECTRONIC-RECORD', NULL, NULL, '2026-09-16 17:29:52', '2026-09-16 17:29:52'),
(40, 42, 'BEX-DOC-2026-0042-FKWVS7YO-0C4FNJRX31NXUBSSAVKSDC', 'BEX-DOC', 2026, 42, 'FKWVS7YO-0C4FNJRX31NXUBSSAVKSDC', 'Vimal Chavda', 'vimal@bexcodeservices.com', 'font-signature-1', 'data:image/png;base64,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', 'Completed', '::1', 'SHA256-CERTIFIED-ELECTRONIC-RECORD', NULL, '2026-09-17 00:37:26', '2026-09-16 17:34:34', '2026-09-16 19:07:26'),
(41, 43, 'BEX-DOC-2026-0043-AN3HI7BT-86XU862008H720TRK4A6L9', 'BEX-DOC', 2026, 43, 'AN3HI7BT-86XU862008H720TRK4A6L9', 'Order B', 'order.b@example.com', 'font-signature-1', 'Order Bee', 'Completed', '::1', 'SHA256-CERTIFIED-ELECTRONIC-RECORD', NULL, '2026-09-17 00:28:18', '2026-09-16 18:58:14', '2026-09-16 18:58:18'),
(42, 44, 'BEX-DOC-2026-0044-ISK1W9AB-B9OWJHDJYB43TE973DT4M4', 'BEX-DOC', 2026, 44, 'ISK1W9AB-B9OWJHDJYB43TE973DT4M4', 'Vimal Chavda', 'vimal@bexcodeservices.com', 'font-signature-1', 'data:image/png;base64,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', 'In Progress', '::1', 'SHA256-CERTIFIED-ELECTRONIC-RECORD', NULL, '2026-09-17 00:30:55', '2026-09-16 18:58:20', '2026-09-16 19:00:55'),
(43, 45, 'BEX-DOC-2026-0045-HVRR9BV6-F684UGZF7TP4ZDWUVN2EVJ', 'BEX-DOC', 2026, 45, 'HVRR9BV6-F684UGZF7TP4ZDWUVN2EVJ', 'Vimal Chavda', 'vimal@bexcodeservices.com', 'font-signature-1', NULL, 'Draft', '223.181.69.208', 'SHA256-CERTIFIED-ELECTRONIC-RECORD', NULL, NULL, '2026-09-16 18:58:21', '2026-09-16 18:58:21'),
(44, 46, 'BEX-DOC-2026-0046-H1RXTPDE-T4RJCFEZXSAKUIZHS8OBH', 'BEX-DOC', 2026, 46, 'H1RXTPDE-T4RJCFEZXSAKUIZHS8OBH', 'Vimal Chavda', 'vimal@bexcodeservices.com', 'font-signature-1', NULL, 'Draft', '223.181.69.208', 'SHA256-CERTIFIED-ELECTRONIC-RECORD', NULL, NULL, '2026-09-16 19:01:39', '2026-09-16 19:01:39'),
(45, 47, 'BEX-DOC-2026-0047-4I73PHWE-GNWHTP5DN09VP130OT31U', 'BEX-DOC', 2026, 47, '4I73PHWE-GNWHTP5DN09VP130OT31U', 'Vimal Chavda', 'chavdavimaln@gmail.com', 'font-signature-1', NULL, 'Draft', '223.181.69.208', 'SHA256-CERTIFIED-ELECTRONIC-RECORD', NULL, NULL, '2026-09-16 19:05:52', '2026-09-16 19:05:52');

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
  `signed_at` datetime DEFAULT NULL,
  `role_label` varchar(50) DEFAULT NULL,
  `delivery_mode` varchar(30) DEFAULT NULL,
  `private_note` text DEFAULT NULL,
  `sent_at` datetime DEFAULT NULL,
  `viewed_at` datetime DEFAULT NULL,
  `signed_ip` varchar(45) DEFAULT NULL,
  `signed_user_agent` varchar(255) DEFAULT NULL,
  `signature_image` longtext DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `document_recipients`
--

INSERT INTO `document_recipients` (`id`, `document_id`, `name`, `email`, `role`, `signing_order_index`, `status`, `secure_token`, `otp_code`, `signed_at`, `role_label`, `delivery_mode`, `private_note`, `sent_at`, `viewed_at`, `signed_ip`, `signed_user_agent`, `signature_image`) VALUES
(20, 34, 'Vimal Chavda', 'vimal@bexcodeservices.com', 'signer', 1, 'signed', NULL, NULL, '2026-09-16 18:31:37', 'Needs to sign', 'Email', '', '2026-09-16 18:29:15', '2026-09-16 18:30:09', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAbgAAACMCAYAAAAOVry8AAAQAElEQVR4AeydeYwkV33Hf7+a2Xuna3Z3tmvWHD7AeLp68Y0dE0JsRHCsKI6BTSAYRTnhD4MDlpIgZBJwZFmyIqwEI5EoiYLMFVvYcYQCAYJXxDjY2Fpsdqp3ScAH9nq617s73XvMeme6Xn7Vs1X9qqd6pru6uru6+1uq1/V7r97xe5/XU995dbVBWEAABEAABEBgCAlA4IZwUNElEAABEAABIggcvgXxCaAkCIAACKSYAAQuxYMD10AABEAABOITgMDFZ4eSIAAC8QmgJAh0nQAEruuI0QAIgAAIgEA/CEDg+kEdbYIACIAACMQn0GJJCFyLoJANBEAABEBgsAhA4AZrvOAtCIAACIBAiwQgcC2CGq1s6C0IgAAIDD4BCNzgjyF6AAIgAAIgEEEAAhcBBUkgAALxCaAkCKSFAAQuLSMBP0AABEAABBIlAIFLFCcqAwEQAAEQiE8g2ZIQuGR5ojYQAAEQAIGUEIDApWQg4AYIgAAIgECyBCBwyfJMe23wDwRAAARGhgAEbmSGGh0FARAAgdEiAIHrwXhPTs+cZ1r2s5NW7gc9aA5NgEB3CKBWEBgwAhC4HgyY6xq/L82cp4jfKmJ3rdhYQQAEQAAEukzA6HL9qB4EQAAEQAAE+kIAAtcX7GgUBEAABECg2wQgcN0mjPpBAARAAAT6QgAC1xfsyTeKGkEABEAABMIEIHBhHoiBAAiAAAgMCQEIXC8GkunCXjSDNkAgHgGUAoHhJACB68G4MqlzgmYUXxrYMEAABEAABLpGAALXNbSoGARAAASGn0CaewiBS/PowDcQAAEQAIHYBCBwsdGhIAiAAAiAQJoJQODSPDqebwggAAIgAAKxCEDgYmFDIRAAARAAgbQTgMClfYTgHwjEJ4CSIDDSBCBwPRh+pSh4TMBVNNGDJvvWRCabc03LVhkr93jfnEDDIAACICAEIHACodsrM6332zCILN8etq0pwsay1Pql6KraFh8gAAKDSWAIvJbj7RD0Al3oCoHJnfZlppV/0LTsu9ZqQPKoUB7mM6E4IiAAAiDQYwIQuB4DH6jmWP0RkXq3+PwJ03rzBbKNXBvFTclSKTobIjMjEQRAAAR6RAAC1yPQK5tJf4pivsj30lBqq2/r20hxKxXwvdIhwQYBEOgLARyI+oJ9QBpVNON7usRLr/dtf5vJ5kKnJWXiRhWIm48HWxAAgT4TgMD1eQBS3TzX7/hkpvNIW0TcqswcpJwVt3pCsAdGNwigThAAgbUJQODWZjTKOQLBMlxjgw8ik80fY+bguwNx88lgCwIgkCYCwUEqTU7Bl/QSkGtuX2ZWk7qHcloyEEI9HTYIgEAaCYyOTxC40Rnrjns6OXmpJ2wf0CsqFx2Imw4ENgiAQGoIQOB6MBRK8Sa/GcV1208blK3acOaY7ivETacBGwRAIG0EIHDJj8iKGg2mLfVEFYhdPS21VvAGFsX0N7qX5eKh0E0n+j7YIAACIJAGAhC4HoyCIgpu0CDi/TQwi1oX5aqh1LeJ5p+P2oc0EAABEEgLAQhcb0ZizG+Gq8Zjvp3+LQd+B76yOnKsVLg+iMNIlgBqAwEQSIwABC4xlKtWFNyIMf/K/r2r5kzxTqVosTxXmEqxi3ANBEAABAICEDhBMbHTXvSCmN1aA4HrVgNJ17tjx4VXN9ZZKTnBNbnGfYiDAAj0nQAcaCAw8gI3kc2dMgwa94JnE5YagcXxsdDjALVEfIAACIDAABEYeYGTqVVwV6NuJzaGWy/OanUpzU61ycQrZnCpdhjOgQAIgEADgZEXuAYeq0bj7Mxsqb6jXk65dTsZa+vO3U+blq0y2VzCdXPoMQClVDUZj1ELCIAACPSGAASuy5xZqSvrTfBS3e7c2r7T/sMxw73Yq4ll8YTOsxMK2/V6to5vzuhx2CAAAiCQdgIQuC6PELMKflONiU4n1dz2Xflfrxr0T431JTiTCz0icOjQU6ca20K8HQLICwIg0GsCELguE1eKX+s3oUid8O1Ot1VXfTOqDpnIcUIiF3w35PTkwFw7jGKCNBAAgdEkEBzERrP7tV4HB28Rh1pCwh/158YUHUmi7sZTkUrRCV2EpB88kc0lNluUy28/ScJv1AECIBCPAErFIzDyAifqdiYeutZKKVaBwCk2Op7BZabs5/SWlXLdSsmZqJQKobE0mLXXg+kl1rYzVq6k5zJ4/CU9DhsEQAAEBoFA6KA4CA4n7SNHXMdKsg2mutAw0SOd1s1jdK5eR6V0ILhW1vh2/9inKhXt1NsQW1yXT6wgAAIgMEAERl7gKnOFW0gbMJm9PKtFkzADcSgXZ2/vpMKMNVPUyytXhWZz3j45XRncDOKdqtwylfszL73DoDosj+IgAAIg0HMCIy9wK4grev2KtJQkMBn6Q+NUOVw4nxqWSsnRfpqHaHyM727I0koUgtYKJeQBARBINQEj1d71x7lgxtVp8xPT+T/X6uhINBpPN8q1t+Na3SHTZfXfesKEZTt6HHaiBFAZCIBASglA4GRglCyyqa3eab2akcCHodSeoBqmxcBu09g+lf9Yo19y7a3pg9fH5wpvly4FgiqDnGuzyXB2g6SKcBJiIAACIJB2Ajhw1UaIm86Garvjf7wxKKroWGC3aSwZ7mf1IktL7lE9HmVXGu6qnMjasR8bkOt6eE1XFGSkgUCnBFC+qwQgcIL31NGt75ZNF1aeqFeqYj1LNjGVf7Rx9nbyyIEd9XqbWzKLC4TJYIr92MDCxpOfat4K9oAACIBAOgkY6XSrt14tLT3xPb3FzHTuST0e31ZjfllF6p99u50tG+5b28mv55VZ3Lgeb7yOp+/TbWaq6PGtpzffoMdhgwAIgMAgEBhygYs5BC5fErNkY7HghpVK8cBXG3e2EmdZWsnXLI8Ia/DYg1TFO3bkbmmW109nFT5lW1X8aX9fv7Zbp/O2md39hn61j3ZBAAQGjwAE7uyYyem8s5a3qc+8vFicsOGC3IVxyiVdplIsXKDXuTTO9+rxKFsx79LTmWnctGwlwc1YuYWMZc+aWfuhULDyX53M5u5tJWSyuU9NWrmPNQumNfOJyWz+Lyct+0umZf/YtPJLY0rNErv/Nzk9c63uG2wQAAEQaEYAAlcnE9x1yLLUk+NZG06Qft0q1m+1TeycSeTnddT6pY/ovRCBWcOfpgLPTLyRiWxiuikUSL1fhPGWVgIz36GI72kWiIy7FKvPKKKbiUhm03V/lGu8SdJ6sqIREACBwSYAgfPHj/lF30xiy2y8Tasn1h2MhmGMaXXENiu/+OnnZYYqerFchQgMm9P2C8uxFZ9b9RSlKBGR1ets31bPEKmviS+fKZecf2i/PEqAAAiMIgEI3NlRrxTz5581E9q401pFL2t2X8xKw2MDpOh1U9bFNzY6k8naD+hplZKzznvHpRcUqXtk3wuyPU1KHZc65v0gaa+ICD3XSlCKHpV8e1cLIsi/xy5dvmVs05ZysXCJhN8VXz4t7WMFgQEgABfTQAACF4zCA8Et9V6SaeUe9LbxA2/0y8oBPfRmET99te1WayZ0Z+dqeVvdd2bM/aied5GWHtbjNZspuMYlfoceTpfrebeVi865st1ULhUy5ZKzzQ+StrNcLJzfShCh+hXJd91qoVIq3Dd/2Nl36NBTwbs1CQsIgAAItEEAAtcElqv4N5rsajWZ/YyVbdU7fLvVLbv89lbztppv4dCBe92G36RrvB4nTgfCbDD9b6t1Ix8IgAAIpI3AoApcVzjKabHgOpUc3Ncn1sjBg8Gt+onVGbOi4yVnSu+ndz0uY9kvR1V3YuPJP45KRxoIgAAIDAIBCJw2Smzwj7VobHNr1v5Q7MI9KCin/0LjzkTTW3fu/h2it4QfKXj++f/pgTtoAgRAAAS6QiB0oOtKCwNUaXnOuVx317RyT+vxVm2BequWd41b8rWcPTSXxpfu0psbM9x/nbROrrwmp2caFhv9AAEQGAkCciweiX7G6qRS9OZYBYku0sp160XOWhPtmydf+uknpX8h30SJg4fTZV/oBpP2W0AJEAABEOgvAQhcA39XqQU/ybs+5dvtbJkpeAekXNT7Yjtle5m3UnJCP7kjpyqDFzIzcyKna3vZH7QFAj0ggCYGiAAErmGwjpcKm/WkiV0zt+nxtexzzrkiVL5SdP50rTJ93h8Iuu5HuTj7Tj0OGwRAAAQGjQAEbo0R4yrfvUaW0O6TSwuPhhJSHikXnZAga+6GflFAS4fZBwIZK/dZM2v/QsIxCQ+Y0/Zv98ENNAkCA0UgdQKXBnoNt9GPteOTnJLcreUPXePS0lNl6v31HGuMe2kIvSewLGq5F03LVkz8cWJ6rYRJCXuUS/nee4QWQWCwCEDgIsaLDf5+RHJLScy0rp6R76/byVjdEB93nft+3TtD0d/qcdi9IyCzsy9IOFYXNX7NytbVYTLo8ZXpSAEBENAJQOB0Gmft8pwTvK7KS8pk7VZnYiGech0r8Qelq1U17/mUZDjx0sH75VQl+2H+cOHjSdbfu7oGsyUzu/tdImg/k+AS04clTEb05Iik3S9TuavLxUK2Mud8U+JYQQAEViEQOiCvkm/kdoVnSmpLKwDkAPVYK/k6yXPyyIHtnZRH2XQQ2D59SX7SsvfLd0ZEzf1P8cp7yJ5lG6yKyHvDzFd4nC4rF50pCe8TYXsiyAADBEBgVQIQuKZ4+KS/i2Xx7dW2ckC6TNsflNfSYI4wgampiyZE0J6QsFhVi/vl++JdRwuJGhHLDF39Y5U5Xyk654io3Tz/koNHNqj7C1oYPgIQuCZjWik5E/qujGU7ejzKZqLg/ZWK+N+j8nSSpmTppDzK9oeACNp/STi1ODbm3Zn6FvEieE5SbCJFi6TUU6Tc6+W09rZysfAnJ+Zm1/y+1criAwRAoCkBCFxTNA07lJppSFk1WinOfmDVDDF2uqQeilEMRfpAQK7b3ieidlSCkubfIWGTBH1VzPQCGer2cslZXy4VriyXDnxbzwAbBECgMwK9E7jO/OxLaZkweQenWtssS81o8mFauUea7Eos+UTpwHsTqwwVJUzgClPE7AsSXpbgMtMHpYFtEsKronn5Un2lXHSM+Tnn3PLLhTvDGRADARBIigAEbjWSzN/Qd8uBq+lt/4r4mnre+uu+6mmwhonA5mn7BtPKf0+Cd0t/1bQW5NoZfVj6OC1BzlbLZ319VSn6gUzZriqXnG1ybe3m+i5YIAAC3SIAgVuFrByIbtR3y4xujx7XbTmiBe9xFLHr+FSTInVUr3/E7b5337Rm7jSz9gHTsk9LUOsU/QeRuk6Cd0t/1N+RK07/TL4Xt8psbaNc031bZW72R5KGFQRAoEcEov4we9T0YDQj/3mf8D1lWWjd1Vf48WZbEcabmu1rNf3E4QNZEVRvJe/DdcWTVgsjX0cEtm/P25OW/W8iZCXTyi+Zlq2IjE8Sk/crEcE/MhGNKCY6JeHLImpjEt44X3Q+F5EPSSAAk5TnhAAACBRJREFUAj0gAIFbA7L85x2+m3JbZcV/4XIA/O4a1cTaXSkVDAkswTh+uICxikVx7UIZy/6ozM72iaidkrFU1XVqVhTtt6TkTpmhjcm2yaqqsqMkgvbwepcuF0EzRNC2SPCuv8kurKkgACdGlgAOmi0MvcygvNNNtZwyiZPjWc3UPy71I5LXO+j5UWzTR2DzZNb+kgjZnGnlarMzJvo7mZ1dKqLWeKej7n1tdiZ5ZhXzX4mYcblYGC8XHUsE7abDh519embYIAAC/ScAgWthDGQGFfovPpPNhURMTh7Wf1eNeamFKpGlhwREyH5iTtuviqi5Ek4qJu8mD4uIQ+NKoaU2OzvMpL4xtuj+sghZbXYmp593y7W0O0JZEQEBEEglgQQELpX9StwpmZnJP+/L1TJziBszBQ/uio03mCxj6uunuTO/R4StdsqRiHeTIu8hfJmsUdQimkcLMsAFRXyniJk/O8vOFwu/efToga6/gi3KKaSBAAh0RiB0oO6squEuLar1Xr2HGcte0OL1A6dL3ktxtV0we0nAtHI/lFmaS4Z6gIibnHKszc5eEdH7FleN60TQvNnZZpmd2ZXi7O2EBQRAYCgIQOBaHMZqqRB6i4go2saoooro51HpSIsmkETq1K7LrhRRq0gQ/Hy11CnDI5/h9QQpdbeImT8721kuOTfMv7J/bzgbYiAAAsNCAALXzkiyelLPLrOFF/X4ss04nbUMouufwv87Imruovuqd2dr6G7Xs42L4FFhWdSciXKp8Bdn07EBARAYAQIQuDYGuTxX8F6Uq5VY+WOUlZL5RS0DzMQJbPNeiXX2HY/8Tqk+Yram5HqaukeEzZBgSx6sQ0kAnQKB1QlA4Fbns2KvUnRcT5zM5r+ux4keez4cRywJAua0/YBZe+h6l/dKrJXveCS5okbqWRE07xSkXE8r3JZEu6gDBEBgcAlA4Nocu0rJqT8SIGUVq/fIBmuXCJiWXZSgRL72iIaNrWiGyXvP47+IsMlsreD9aOiKLEgAARAYTQKrCdxoEmmh10rV7sJrISeyxCEwYdl/LzM277k17xpaNrIOxS+Wj294TXnO8d7z+AeReZAIAiAw0gQgcDGGv1IqBM+9NRQPnb5s2IfoGgRMK/eszNZc+VJ+SGZs3nNrjSWWiNWDMlvjcmn2dXRq36HGDIiDAAiAgE9AjiW+iW07BGQW15j9lBx4Q6cvGzOMVLzFzmas/F+bVs5/IPs8KRZx0wiVNtL4NcJ3XXmuEHoeUfJjBQEQAIFIAhC4SCxrJ8osLjgQy3m003Lw3bJ2KeTwCchMbZ+EKpO6naIfyHblmtt3hStLsIrFZ35IWEAABECgDQIQuDZgNWaVA6938OVK0WnyxozGEqMdz2TtD8psbV6ETf4nIO8F1VHfv+OkeI+wHSsXC79GWEaRAPoMAokQiDrAJFIxKgGBqV0XX56x7FkRtjOeqDHTfURs0srFE7wflYuO9w9DRq6vNTx6sbIAUkAABEBgLQIQuLUIYX/rBC644E2mlX/aF7RFd+kpOY9ri7Cti6zEu8Wf+SMibIaEqyLzIBEEQAAE2iGg5YXAaTBgtkvg2ikzaz8ps7TaLf3myY0H5brZxU0FLahePSeCxmXvFv+52c8HyTBAAARAIEECELgEYY5AVetNy35MBO20bJVplQ4T0xUyS4u6pT/AIecfXxXh+46ImlxX805DFs4PdsIAARAAgS4RgMB1CeywVGtO5x8RQVtYFjT7VSK6RgRtw2r9E0E7Q4q+L4I2LsG7CWdjuVh4l5RxJWAFARAAgZ4QgMD1BPPgNCKC9i0Rs5MSZIZmK1LqWhG0yJ8G8nulFC2K/Xi5mF1XLjqeoG0ol5xflbSqBKwgAAIg0BcCELi+YE9Poxkr/7CI2QkJvqBdL95tltB0VZ6gKdpX3kEbaoJWctbL9peI9i41LYQdIEBEgAACvSQAgesl7RS0ZVr5r5mW7f04qCtbxaRuFLfWeEidqzKLmy1vOrVJhIwrnqCVnMvJcc5IWawgAAIgkEoCELhUDkuyTpnZ/NdFzGqCRqTeJ7V7Pw4qmiVW5MpVOTV58Ewl+zpP0MrF2fH5orObnnvudGR2JIIACIBA1wm03wAErn1mg1di+Sd9Vhc0op8vbK5e4gtauVSYWVjY++LgdRYegwAIgMAyAQjcModR+/TuZnyB2bguELSi84Yzzx58ZtRAoL8gAALDSwACN7xjG/RMLrR9Tik6OK7Ue5YFzfGeRzt3fm7/3iATEUwQAAEQGCoCELihGs7ozlTmnFsrJWfmSKnwUHQOpIIACIDA8BGAwA3fmKJHINB7AmgRBFJIAAKXwkGBSyAAAiAAAp0TgMB1zhA1gAAIgAAIxCfQtZIQuK6hRcUgAAIgAAL9JACB6yd9tA0CIAACINA1AhC4rqFNT8XwBARAAARGkQAEbhRHHX0GARAAgREgAIEbgUFGF0EgPgGUBIHBJQCBG9yxg+cgAAIgAAKrEIDArQIHu0AABEAABOIT6HdJCFy/RwDtgwAIgAAIdIUABK4rWFEpCIAACIBAvwlA4Po9Ap20j7IgAAIgAAJNCUDgmqLBDhAAARAAgUEmAIEb5NGD7yAQnwBKgsDQE4DADf0Qo4MgAAIgMJoEIHCjOe7oNQiAAAjEJzAgJSFwAzJQcBMEQAAEQKA9AhC49nghNwiAAAiAwIAQgMClcqDgFAiAAAiAQKcEIHCdEkR5EAABEACBVBKAwKVyWOAUCMQngJIgAALLBP4fAAD//zugpCkAAAAGSURBVAMAA0Rac1ocdMQAAAAASUVORK5CYII='),
(21, 34, 'vnc', 'chavdavimaln@gmail.com', 'signer', 2, 'signed', NULL, NULL, '2026-09-16 18:33:51', 'Needs to sign', 'Email', '', '2026-09-16 18:31:42', '2026-09-16 18:33:29', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'vc'),
(22, 35, 'Vimal Chavda', 'vimal@bexcodeservices.com', 'signer', 1, 'signed', NULL, NULL, '2026-09-16 18:55:59', 'Needs to sign', 'Email', '', '2026-09-16 18:55:30', '2026-09-16 18:55:47', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'data:image/png;base64,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'),
(23, 35, 'vnc', 'chavdavimaln@gmail.com', 'signer', 2, 'signed', NULL, NULL, '2026-09-16 18:56:32', 'Needs to sign', 'Email', '', '2026-09-16 18:56:04', '2026-09-16 18:56:22', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'vc'),
(24, 36, 'Order A', 'order.a@example.com', 'signer', 1, 'sent', NULL, NULL, NULL, 'Needs to sign', 'Email', NULL, '2026-09-16 22:53:41', NULL, NULL, NULL, NULL),
(25, 36, 'Order B', 'order.b@example.com', 'signer', 2, 'pending', NULL, NULL, NULL, 'Needs to sign', 'Email', NULL, NULL, NULL, NULL, NULL, NULL),
(26, 37, 'Order B', 'order.b@example.com', 'signer', 1, 'signed', NULL, NULL, '2026-09-16 22:45:06', 'Needs to sign', 'Email', NULL, '2026-09-16 22:45:06', '2026-09-16 22:45:06', '::1', 'node', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=='),
(27, 37, 'Order A', 'order.a@example.com', 'signer', 2, 'sent', NULL, NULL, NULL, 'Needs to sign', 'Email', NULL, '2026-09-16 22:45:07', NULL, NULL, NULL, NULL),
(28, 38, 'Order A', 'order.a@example.com', 'signer', 1, 'signed', NULL, NULL, '2026-09-16 22:45:08', 'Needs to sign', 'Email', NULL, '2026-09-16 22:45:08', '2026-09-16 22:45:08', '::1', 'node', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=='),
(29, 38, 'Order B', 'order.b@example.com', 'signer', 1, 'signed', NULL, NULL, '2026-09-16 22:45:08', 'Needs to sign', 'Email', NULL, '2026-09-16 22:45:08', '2026-09-16 22:45:08', '::1', 'node', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=='),
(30, 38, 'Order C', 'order.c@example.com', 'signer', 2, 'sent', NULL, NULL, NULL, 'Needs to sign', 'Email', NULL, '2026-09-16 22:45:09', NULL, NULL, NULL, NULL),
(31, 39, 'Order A', 'order.a@example.com', 'signer', 1, 'sent', NULL, NULL, NULL, 'Needs to sign', 'Email', NULL, '2026-09-16 22:45:09', NULL, NULL, NULL, NULL),
(32, 39, 'Order B', 'order.b@example.com', 'signer', 2, 'sent', NULL, NULL, NULL, 'Needs to sign', 'Email', NULL, '2026-09-16 22:45:09', NULL, NULL, NULL, NULL),
(33, 39, 'Order C', 'order.c@example.com', 'signer', 3, 'sent', NULL, NULL, NULL, 'Needs to sign', 'Email', NULL, '2026-09-16 22:45:10', NULL, NULL, NULL, NULL),
(34, 40, 'Order C', 'order.c@example.com', 'signer', 1, 'pending', NULL, NULL, NULL, 'Needs to sign', 'Email', NULL, NULL, NULL, NULL, NULL, NULL),
(35, 40, 'Order A', 'order.a@example.com', 'signer', 2, 'pending', NULL, NULL, NULL, 'Needs to sign', 'Email', NULL, NULL, NULL, NULL, NULL, NULL),
(36, 41, 'Vimal Chavda', 'vimal@bexcodeservices.com', 'signer', 1, 'pending', NULL, NULL, NULL, 'Needs to sign', 'Email', '', NULL, NULL, NULL, NULL, NULL),
(37, 42, 'Vimal Chavda', 'vimal@bexcodeservices.com', 'signer', 2, 'signed', NULL, NULL, '2026-09-17 00:37:25', 'Needs to sign', 'Email', '', '2026-09-17 00:14:04', '2026-09-17 00:37:11', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'data:image/png;base64,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'),
(38, 42, 'vnc', 'chavdavimaln@gmail.com', 'signer', 1, 'signed', NULL, NULL, '2026-09-17 00:14:00', 'Needs to sign', 'Email', '', '2026-09-16 23:12:32', '2026-09-16 23:13:00', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'vc'),
(39, 43, 'Vimal Chavda', 'vimal@bexcodeservices.com', 'signer', 1, 'signed', NULL, NULL, '2026-09-17 00:28:16', 'Needs to sign', 'Email', NULL, '2026-09-17 00:28:15', '2026-09-17 00:28:16', '::1', 'node', 'data:image/png;base64,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'),
(40, 43, 'Order B', 'order.b@example.com', 'signer', 2, 'signed', NULL, NULL, '2026-09-17 00:28:18', 'Needs to sign', 'Email', NULL, '2026-09-17 00:28:16', '2026-09-17 00:28:18', '::1', 'node', 'Order Bee'),
(41, 44, 'Vimal Chavda', 'vimal@bexcodeservices.com', 'signer', 1, 'signed', NULL, NULL, '2026-09-17 00:30:54', 'Needs to sign', 'Email', NULL, '2026-09-17 00:30:31', '2026-09-17 00:30:40', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Claude/2.110.0 Chrome/152.0.7977.76 Safari/537.36 MSIX', 'data:image/png;base64,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'),
(42, 44, 'Order B', 'order.b@example.com', 'signer', 2, 'sent', NULL, NULL, NULL, 'Needs to sign', 'Email', NULL, '2026-09-17 00:30:55', NULL, NULL, NULL, NULL),
(43, 45, 'Vimal Chavda', 'vimal@bexcodeservices.com', 'signer', 1, 'pending', NULL, NULL, NULL, 'Needs to sign', 'Email', NULL, NULL, NULL, NULL, NULL, NULL),
(44, 45, 'Order B', 'order.b@example.com', 'signer', 2, 'pending', NULL, NULL, NULL, 'Needs to sign', 'Email', NULL, NULL, NULL, NULL, NULL, NULL),
(45, 46, 'Vimal Chavda', 'vimal@bexcodeservices.com', 'signer', 1, 'pending', NULL, NULL, NULL, 'Needs to sign', 'Email', NULL, NULL, NULL, NULL, NULL, NULL),
(46, 46, 'Order B', 'order.b@example.com', 'signer', 2, 'pending', NULL, NULL, NULL, 'Needs to sign', 'Email', NULL, NULL, NULL, NULL, NULL, NULL);

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
(1, 'EMP001', 'Vimal Chavda', 'vimal@bexcodeservices.com', 'Software Specialist', 'Engineering', 'VC', 'BEX-SIGN-VC-EMP001-2026-361682B4', 'data:image/png;base64,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', 'font-signature-1', 'Active', '2026-09-01 19:43:38', '2026-09-16 19:07:26'),
(2, 'EMP002', 'Manu Yadav', 'manu.yadav@oladigital.health', 'Operations Director', 'Operations', 'MY', 'BEX-SIGN-MY-EMP002-2026-781920A1', NULL, 'font-signature-2', 'Active', '2026-09-01 19:43:38', '2026-09-01 19:43:38'),
(3, 'EMP003', 'Dhruv Patel', 'dhruv@bexcodeservices.com', 'Quality Lead', 'Quality Assurance', 'DP', 'BEX-SIGN-DP-EMP003-2026-928371C3', NULL, 'font-signature-1', 'Active', '2026-09-01 19:43:38', '2026-09-01 19:43:38'),
(5, 'EMP943', 'Signer One', 'signer.one@example.com', 'Software Specialist', 'Engineering', 'SO', 'BEX-SIGN-SO-EMP943-2026-B1A814D88E74476F', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'font-signature-1', 'Active', '2026-09-15 18:39:41', '2026-09-15 18:39:41'),
(6, 'EMP638', 'Signer Two', 'signer.two@example.com', 'Software Specialist', 'Engineering', 'ST', 'BEX-SIGN-ST-EMP638-2026-5A1426D405E4EFDE', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'font-signature-1', 'Active', '2026-09-15 18:39:42', '2026-09-15 18:59:39'),
(7, 'EMP524', 'vc', 'chavdavimaln@gmail.com', 'Software Specialist', 'Engineering', 'V', 'BEX-SIGN-V-EMP524-2026-4A0319B439CD1CF0', 'vc', 'font-signature-1', 'Active', '2026-09-16 10:51:35', '2026-09-16 18:44:00');

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
-- Table structure for table `issued_pdf_fingerprints`
--

CREATE TABLE `issued_pdf_fingerprints` (
  `id` int(11) NOT NULL,
  `sha256` char(64) NOT NULL,
  `document_id` int(11) NOT NULL,
  `file_index` int(11) DEFAULT NULL,
  `kind` varchar(20) NOT NULL,
  `file_name` varchar(255) DEFAULT NULL,
  `recipient_email` varchar(255) DEFAULT NULL,
  `file_path` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `issued_pdf_fingerprints`
--

INSERT INTO `issued_pdf_fingerprints` (`id`, `sha256`, `document_id`, `file_index`, `kind`, `file_name`, `recipient_email`, `file_path`, `created_at`) VALUES
(6, 'b4569f3f4084ad355f02ddae025b49ec6ec97f25e21c211acdc5d39d493189b0', 42, 0, 'signed', 'doc-2.pdf', NULL, '/uploads/completed/42/01-doc-2.pdf', '2026-09-16 19:10:40'),
(7, '9f2032b88dddf163b62812a33c63e614b43b7b22626646404a83774430e5eb91', 42, 1, 'signed', 'doc-3.pdf', NULL, '/uploads/completed/42/02-doc-3.pdf', '2026-09-16 19:10:40'),
(8, '785248c49a805d4ad8e394693e419210f188fcd79d395184cecb0ab5342b5eca', 42, NULL, 'certificate', 'Certificate of Completion.pdf', NULL, '/uploads/completed/42/certificate-of-completion.pdf', '2026-09-16 19:10:40');

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
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `id` int(11) NOT NULL,
  `role_key` varchar(50) NOT NULL,
  `role_name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `permissions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`permissions`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`id`, `role_key`, `role_name`, `description`, `permissions`, `created_at`) VALUES
(1, 'manager', 'Manager (Admin)', 'Complete administrative access over all users, roles, organizational documents, templates, audit trails, and system settings.', '{\"all\":true,\"manage_users\":true,\"manage_roles\":true,\"manage_all_docs\":true,\"delete_docs\":true,\"manage_settings\":true,\"manage_templates\":true,\"view_audit_logs\":true,\"export_reports\":true}', '2026-09-10 19:06:36'),
(2, 'leader', 'Leader (Team Admin)', 'Team leadership access to manage team members, invite users, oversee team documents, share templates, and view team reports.', '{\"manage_team\":true,\"invite_members\":true,\"view_team_docs\":true,\"create_docs\":true,\"manage_templates\":true,\"view_reports\":true,\"sign_docs\":true}', '2026-09-10 19:06:36'),
(3, 'team_member', 'Team Member', 'Standard operational user access to create, send, and sign documents, use shared templates, and manage own profile.', '{\"create_docs\":true,\"sign_docs\":true,\"view_own_docs\":true,\"view_templates\":true,\"manage_profile\":true}', '2026-09-10 19:06:36');

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

--
-- Dumping data for table `signature_events`
--

INSERT INTO `signature_events` (`id`, `document_id`, `recipient_id`, `event_type`, `ip_address`, `user_agent`, `created_at`) VALUES
(30, 34, 20, 'sent', NULL, NULL, '2026-09-16 12:59:15'),
(31, 34, 20, 'viewed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-16 13:00:09'),
(32, 34, 20, 'viewed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-16 13:00:09'),
(33, 34, 20, 'signed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-16 13:01:37'),
(34, 34, 21, 'sent', NULL, NULL, '2026-09-16 13:01:42'),
(35, 34, 21, 'viewed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-16 13:03:29'),
(36, 34, 21, 'viewed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-16 13:03:29'),
(37, 34, 21, 'signed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-16 13:03:51'),
(38, 35, 22, 'sent', NULL, NULL, '2026-09-16 13:25:30'),
(39, 35, 22, 'viewed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-16 13:25:47'),
(40, 35, 22, 'signed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-16 13:25:59'),
(41, 35, 23, 'sent', NULL, NULL, '2026-09-16 13:26:04'),
(42, 35, 23, 'viewed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-16 13:26:22'),
(43, 35, 23, 'viewed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-16 13:26:22'),
(44, 35, 23, 'signed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-16 13:26:32'),
(45, 36, 24, 'sent', NULL, NULL, '2026-09-16 17:15:02'),
(46, 36, 24, 'signed', '::1', 'node', '2026-09-16 17:15:02'),
(47, 36, 25, 'sent', NULL, NULL, '2026-09-16 17:15:02'),
(48, 36, 25, 'signed', '::1', 'node', '2026-09-16 17:15:03'),
(49, 36, 24, 'sent', NULL, NULL, '2026-09-16 17:15:04'),
(50, 36, 24, 'signed', '::1', 'node', '2026-09-16 17:15:04'),
(51, 36, 25, 'sent', NULL, NULL, '2026-09-16 17:15:05'),
(52, 37, 26, 'sent', NULL, NULL, '2026-09-16 17:15:06'),
(53, 37, 26, 'signed', '::1', 'node', '2026-09-16 17:15:06'),
(54, 37, 27, 'sent', NULL, NULL, '2026-09-16 17:15:07'),
(55, 38, 28, 'sent', NULL, NULL, '2026-09-16 17:15:08'),
(56, 38, 29, 'sent', NULL, NULL, '2026-09-16 17:15:08'),
(57, 38, 28, 'signed', '::1', 'node', '2026-09-16 17:15:08'),
(58, 38, 29, 'signed', '::1', 'node', '2026-09-16 17:15:08'),
(59, 38, 30, 'sent', NULL, NULL, '2026-09-16 17:15:09'),
(60, 39, 31, 'sent', NULL, NULL, '2026-09-16 17:15:09'),
(61, 39, 32, 'sent', NULL, NULL, '2026-09-16 17:15:10'),
(62, 39, 33, 'sent', NULL, NULL, '2026-09-16 17:15:10'),
(63, 36, 24, 'sent', NULL, NULL, '2026-09-16 17:23:41'),
(64, 42, 38, 'sent', NULL, NULL, '2026-09-16 17:42:32'),
(65, 42, 38, 'viewed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-16 17:43:00'),
(66, 42, 38, 'signed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-16 18:44:00'),
(67, 42, 37, 'sent', NULL, NULL, '2026-09-16 18:44:04'),
(68, 43, 39, 'sent', NULL, NULL, '2026-09-16 18:58:15'),
(69, 43, 39, 'signed', '::1', 'node', '2026-09-16 18:58:16'),
(70, 43, 40, 'sent', NULL, NULL, '2026-09-16 18:58:16'),
(71, 43, 40, 'signed', '::1', 'node', '2026-09-16 18:58:18'),
(72, 44, 41, 'sent', NULL, NULL, '2026-09-16 19:00:31'),
(73, 44, 41, 'viewed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Claude/2.110.0 Chrome/152.0.7977.76 Safari/537.36 MSIX', '2026-09-16 19:00:40'),
(74, 44, 41, 'signed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Claude/2.110.0 Chrome/152.0.7977.76 Safari/537.36 MSIX', '2026-09-16 19:00:55'),
(75, 44, 42, 'sent', NULL, NULL, '2026-09-16 19:00:55'),
(76, 42, 37, 'viewed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-16 19:07:12'),
(77, 42, 37, 'signed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-16 19:07:25');

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
  `role` varchar(50) DEFAULT 'team_member',
  `is_verified` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `first_name`, `last_name`, `email`, `username`, `password_hash`, `company`, `phone`, `role`, `is_verified`, `created_at`, `updated_at`) VALUES
(1, 'Vimal', 'Chavda', 'vimal@bexcodeservices.com', NULL, '$2a$10$FD6zaPbKw4dY0GRFnqzZE.UhaNGA4PC/tRARXJ61WjKMcYYU3YYna', NULL, NULL, 'manager', 0, '2026-08-27 09:56:08', '2026-09-10 19:50:56'),
(2, 'Manu', 'Yadav', 'admin@bexsign.com', NULL, '$2a$10$fGRxOZbEzsHrJnm4Xw07eOFY24noqWXVYGl3Tk.7A9qIMS8F8NUNC', 'Dcode Health', NULL, 'leader', 1, '2026-08-27 15:11:32', '2026-09-15 19:09:18'),
(3, 'Aakash', 'Shah', 'aakash@bexcodeservices.com', NULL, '$2a$10$mMvjkfZn6cWTluvYRjtVo.aMO/LpYclC/P7mplxyCay1aFtlYfFdS', 'BexSign Workspace', NULL, 'leader', 0, '2026-09-10 19:08:43', '2026-09-10 19:08:43'),
(4, 'Dhruv', 'Patel', 'dhruv@bexcodeservices.com', NULL, '$2a$10$Nf1TJebBX/l9/su5x8.LUuIbDb78R7FUGa7NUkQ4BCTF96LX8LpgK', 'BexSign Workspace', NULL, 'team_member', 0, '2026-09-10 19:08:53', '2026-09-10 19:08:53');

-- --------------------------------------------------------

--
-- Table structure for table `user_login_logs`
--

CREATE TABLE `user_login_logs` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `role` varchar(50) NOT NULL,
  `ip_address` varchar(50) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `status` enum('success','failed') DEFAULT 'success',
  `login_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
  `date_format` varchar(20) DEFAULT 'YYYY-MM-DD',
  `department` varchar(100) DEFAULT 'General',
  `designation` varchar(100) DEFAULT 'Team Member',
  `phone` varchar(50) DEFAULT NULL,
  `avatar_url` varchar(255) DEFAULT NULL,
  `status` enum('active','inactive','invited') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_profiles`
--

INSERT INTO `user_profiles` (`id`, `user_id`, `profile_image`, `timezone`, `language`, `date_format`, `department`, `designation`, `phone`, `avatar_url`, `status`, `created_at`, `updated_at`) VALUES
(1, 1, NULL, 'UTC', 'en', 'YYYY-MM-DD', 'Executive', 'Manager', NULL, NULL, 'active', '2026-09-10 19:06:53', '2026-09-10 19:06:53'),
(2, 2, NULL, 'UTC', 'en', 'YYYY-MM-DD', 'Executive', 'Manager', NULL, NULL, 'active', '2026-09-10 19:06:53', '2026-09-10 19:06:53'),
(3, 3, NULL, 'UTC', 'en', 'YYYY-MM-DD', 'Product & Legal', 'Team Leader', NULL, NULL, 'active', '2026-09-10 19:08:43', '2026-09-10 19:08:43'),
(4, 4, NULL, 'UTC', 'en', 'YYYY-MM-DD', 'Engineering', 'Software Developer', NULL, NULL, 'active', '2026-09-10 19:08:53', '2026-09-10 19:08:53');

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
-- Indexes for table `issued_pdf_fingerprints`
--
ALTER TABLE `issued_pdf_fingerprints`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_sha256` (`sha256`),
  ADD KEY `idx_document` (`document_id`);

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
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `role_key` (`role_key`);

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
-- Indexes for table `user_login_logs`
--
ALTER TABLE `user_login_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=199;

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=48;

--
-- AUTO_INCREMENT for table `document_fields`
--
ALTER TABLE `document_fields`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=277;

--
-- AUTO_INCREMENT for table `document_field_values`
--
ALTER TABLE `document_field_values`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=54;

--
-- AUTO_INCREMENT for table `document_files`
--
ALTER TABLE `document_files`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=50;

--
-- AUTO_INCREMENT for table `document_identifiers`
--
ALTER TABLE `document_identifiers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=46;

--
-- AUTO_INCREMENT for table `document_recipients`
--
ALTER TABLE `document_recipients`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=47;

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

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
-- AUTO_INCREMENT for table `issued_pdf_fingerprints`
--
ALTER TABLE `issued_pdf_fingerprints`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

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
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=78;

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `user_login_logs`
--
ALTER TABLE `user_login_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `user_profiles`
--
ALTER TABLE `user_profiles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

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
-- Constraints for table `user_login_logs`
--
ALTER TABLE `user_login_logs`
  ADD CONSTRAINT `user_login_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

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
