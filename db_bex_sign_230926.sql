-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Sep 22, 2026 at 08:42 PM
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
(168, 41, 'Document \"Blank Agreement Document.pdf\" created as draft with ID: BEX-DOC-2026-0041-KATW7LGG-YUA0T8L8XRKXY7DG6G7LI', '::1', '2026-09-16 17:29:52'),
(169, 42, 'Document \"Blank Agreement Document.pdf\" created as draft with ID: BEX-DOC-2026-0042-FKWVS7YO-0C4FNJRX31NXUBSSAVKSDC', '::1', '2026-09-16 17:34:34'),
(170, 42, 'Signature request emailed to vnc (chavdavimaln@gmail.com)', '127.0.0.1', '2026-09-16 17:42:32'),
(171, 42, 'Document \"doc-2\" sent for signature (in order) to: chavdavimaln@gmail.com', '::1', '2026-09-16 17:42:32'),
(172, 42, 'vnc (chavdavimaln@gmail.com) viewed the document', '::1', '2026-09-16 17:43:00'),
(173, 42, 'vc (chavdavimaln@gmail.com) signed the document', '::1', '2026-09-16 18:44:00'),
(174, 42, 'Signature request emailed to Vimal Chavda (vimal@bexcodeservices.com)', '127.0.0.1', '2026-09-16 18:44:04'),
(194, 47, 'Document cloned from ID 42 as new document with BexSign ID BEX-DOC-2026-0047-4I73PHWE-GNWHTP5DN09VP130OT31U', '::1', '2026-09-16 19:05:52'),
(195, 42, 'Vimal Chavda (vimal@bexcodeservices.com) viewed the document', '::1', '2026-09-16 19:07:12'),
(196, 42, 'Vimal Chavda (vimal@bexcodeservices.com) signed the document', '::1', '2026-09-16 19:07:26'),
(197, 42, 'All recipients completed \"doc-2\". Document marked Completed.', '::1', '2026-09-16 19:07:26'),
(198, 42, 'Completed documents (2 signed PDFs + certificate of completion) emailed to: vimal@bexcodeservices.com, chavdavimaln@gmail.com', '127.0.0.1', '2026-09-16 19:07:30'),
(199, 48, 'Document \"Standard Employment Agreement 2026.pdf\" created as draft with ID: BEX-DOC-2026-0048-6WDH99UG-JPQI87BOS2CMS2OY619OYB', '::1', '2026-09-17 12:12:00'),
(200, 48, 'Signature request emailed to Vimal Chavda (vimal@bexcodeservices.com)', '127.0.0.1', '2026-09-17 13:09:38'),
(201, 48, 'Document \"sign 1\" sent for signature (in order) to: vimal@bexcodeservices.com', '::1', '2026-09-17 13:09:38'),
(202, 48, 'Vimal Chavda (vimal@bexcodeservices.com) viewed the document', '::1', '2026-09-17 13:09:59'),
(203, 48, 'Vimal Chavda (vimal@bexcodeservices.com) signed the document', '::1', '2026-09-17 13:17:47'),
(204, 48, 'Signature request emailed to v n c (chavdavimaln@gmail.com)', '127.0.0.1', '2026-09-17 13:17:52'),
(205, 48, 'v n c (chavdavimaln@gmail.com) viewed the document', '::1', '2026-09-17 13:19:43'),
(206, 48, 'vc (chavdavimaln@gmail.com) signed the document', '::1', '2026-09-17 13:20:04'),
(207, 48, 'All recipients completed \"sign 1\". Document marked Completed.', '::1', '2026-09-17 13:20:04'),
(208, 48, 'Completed documents (2 signed PDFs + certificate of completion) emailed to: vimal@bexcodeservices.com, chavdavimaln@gmail.com', '127.0.0.1', '2026-09-17 13:20:09'),
(209, 49, 'Document \"Blank Agreement Document.pdf\" created as draft with ID: BEX-DOC-2026-0049-ON3RVK9V-A7V7JWP3XBHT7OT45D8UA', '::1', '2026-09-17 13:48:21'),
(210, 49, 'Signature request emailed to vnc yop mail (vnc@yopmail.com)', '127.0.0.1', '2026-09-17 14:28:03'),
(211, 49, 'Document \"vimal 1\" sent for signature (in order) to: vnc@yopmail.com', '::1', '2026-09-17 14:28:03'),
(212, 49, 'vnc yop mail (vnc@yopmail.com) viewed the document', '::1', '2026-09-17 14:28:39'),
(213, 49, 'vnc yop mail (vnc@yopmail.com) signed the document', '::1', '2026-09-17 14:29:43'),
(214, 49, 'Signature request emailed to cvn (chavdavimaln@gmail.com)', '127.0.0.1', '2026-09-17 14:29:47'),
(215, 49, 'cvn (chavdavimaln@gmail.com) viewed the document', '::1', '2026-09-17 14:30:13'),
(216, 49, 'vc (chavdavimaln@gmail.com) signed the document', '::1', '2026-09-17 14:30:31'),
(217, 49, 'All recipients completed \"vimal 1\". Document marked Completed.', '::1', '2026-09-17 14:30:32'),
(218, 49, 'Completed documents (2 signed PDFs + certificate of completion) emailed to: vimal@bexcodeservices.com, vnc@yopmail.com, chavdavimaln@gmail.com', '127.0.0.1', '2026-09-17 14:30:38'),
(230, 52, 'Document \"Blank Agreement Document.pdf\" created as draft with ID: BEX-DOC-2026-0052-TSXKX7FH-XS3LQ256CHCMM035I48P9G', '::1', '2026-09-17 15:29:27'),
(269, 60, 'Document \"Untitled document\" created as draft with ID: BEX-DOC-2026-0060-6RE1HCIX-KC5XU1ZTNGLRPUL2BL58DJ', '::1', '2026-09-18 06:17:21'),
(270, 60, 'Signature request emailed to vimal yop (vnc@yopmail.com)', '127.0.0.1', '2026-09-18 06:35:30'),
(271, 60, 'Document \"document 1\" sent for signature (in order) to: vnc@yopmail.com', '::1', '2026-09-18 06:35:30'),
(272, 60, 'vimal yop (vnc@yopmail.com) viewed the document', '::1', '2026-09-18 06:37:17'),
(273, 60, 'vnc yop mail (vnc@yopmail.com) signed the document', '::1', '2026-09-18 06:51:43'),
(274, 60, 'Signature request emailed to chavda (chavdavimaln@gmail.com)', '127.0.0.1', '2026-09-18 06:51:47'),
(275, 60, 'chavda (chavdavimaln@gmail.com) viewed the document', '::1', '2026-09-18 08:03:11'),
(276, 60, 'chavda (chavdavimaln@gmail.com) viewed the document', '::1', '2026-09-18 08:03:11'),
(277, 60, 'vc (chavdavimaln@gmail.com) signed the document', '::1', '2026-09-18 08:03:33'),
(278, 60, 'All recipients completed \"document 1\". Document marked Completed.', '::1', '2026-09-18 08:03:33'),
(280, 49, 'Copied to a new draft \"vimal 1 (Copy)\" for editing; this request was not changed', '127.0.0.1', '2026-09-18 08:04:00'),
(284, 60, 'Completed documents (2 signed PDFs + certificate of completion) emailed to: vimal@bexcodeservices.com, vnc@yopmail.com, chavdavimaln@gmail.com', '127.0.0.1', '2026-09-18 08:04:13'),
(290, 49, 'Copied to a new draft \"vimal 1 (Copy 2)\" for editing; this request was not changed', '127.0.0.1', '2026-09-18 08:05:09'),
(296, 52, 'Signature request emailed to yop vimal (vnc@yopmail.com)', '127.0.0.1', '2026-09-18 08:15:03'),
(297, 52, 'Signature request emailed to vimal (chavdavimaln@gmail.com)', '127.0.0.1', '2026-09-18 08:15:07'),
(298, 52, 'Document \"doc 1 vimal\" sent for signature (parallel) to: vnc@yopmail.com, chavdavimaln@gmail.com', '::1', '2026-09-18 08:15:07'),
(299, 52, 'vimal (chavdavimaln@gmail.com) viewed the document', '::1', '2026-09-18 08:15:24'),
(300, 52, 'yop vimal (vnc@yopmail.com) viewed the document', '::1', '2026-09-18 08:17:20'),
(301, 52, 'yop vimal (vnc@yopmail.com) viewed the document', '::1', '2026-09-18 08:17:20'),
(302, 52, 'vnc yop mail (vnc@yopmail.com) signed the document', '::1', '2026-09-18 08:17:43'),
(307, 63, 'Document \"Untitled document\" created as draft with ID: BEX-DOC-2026-0063-8NINLDFN-WPVWH5LSAA9JE5M6QAQRZ', '::1', '2026-09-18 12:08:36'),
(309, 63, 'Copied to a new draft \"Blank Agreement Document (Copy).pdf\" for editing; this request was not changed', '127.0.0.1', '2026-09-18 12:50:46'),
(310, 65, 'Document \"Blank Agreement Document.pdf\" created as draft with ID: BEX-DOC-2026-0065-2U1CZA1X-L1XC6QQZVXTL2UZ2AMROWH', '::1', '2026-09-18 13:12:49'),
(312, 67, 'Created \"vimal 1 (Copy)\" as an editable copy of \"vimal 1\" (BEX-DOC-2026-0049-ON3RVK9V-A7V7JWP3XBHT7OT45D8UA)', '127.0.0.1', '2026-09-18 18:31:58'),
(313, 49, 'Copied to a new draft \"vimal 1 (Copy)\" for editing; this request was not changed', '127.0.0.1', '2026-09-18 18:31:59'),
(314, 67, 'Dhruv Patel (dhruv@bexcodeservices.com) viewed the document', '127.0.0.1', '2026-09-18 18:31:59'),
(315, 67, 'Aakash Shah (aakash@bexcodeservices.com) declined to sign: Wrong amount in clause 3', '127.0.0.1', '2026-09-18 18:32:00'),
(316, 67, 'Signature request emailed to Dhruv Patel (dhruv@bexcodeservices.com)', '127.0.0.1', '2026-09-18 18:32:20'),
(317, 67, 'Reminder emailed to Dhruv Patel (dhruv@bexcodeservices.com)', '127.0.0.1', '2026-09-18 18:32:20'),
(318, 68, 'Document \"Employment Agreement.pdf\" created as draft with ID: BEX-DOC-2026-0068-P71GYF8F-B9XJW66E9PPJSSRK222I', '::1', '2026-09-21 12:31:40'),
(319, 68, 'Signature request emailed to Vimal Chavda (vimal@bexcodeservices.com)', '127.0.0.1', '2026-09-21 13:24:38'),
(320, 68, 'Signature request emailed to vnc (vnc@yopmail.com)', '127.0.0.1', '2026-09-21 13:24:42'),
(321, 68, 'Document \"Employment Agreement.pdf\" sent for signature (parallel) to: vimal@bexcodeservices.com, vnc@yopmail.com', '::1', '2026-09-21 13:24:42'),
(322, 65, 'Signature request emailed to Vimal Chavda (vimal@bexcodeservices.com)', '127.0.0.1', '2026-09-21 13:26:28'),
(323, 65, 'Signature request emailed to vnc yop (vnc@yopmail.com)', '127.0.0.1', '2026-09-21 13:26:32'),
(324, 65, 'Document \"agreement\" sent for signature (in order) to: vimal@bexcodeservices.com, vnc@yopmail.com', '::1', '2026-09-21 13:26:32'),
(378, 63, 'Signature request emailed to Vimal Chavda (vnc@yopmail.com)', '127.0.0.1', '2026-09-21 14:34:49'),
(379, 63, 'Signature request emailed to vnch (chavdavimaln@gmail.com)', '127.0.0.1', '2026-09-21 14:34:53'),
(380, 63, 'Document \"my doc 101\" sent for signature (in order) to: vnc@yopmail.com, chavdavimaln@gmail.com', '::1', '2026-09-21 14:34:53'),
(414, 85, 'Document \"Blank Agreement Document.pdf\" created as draft with ID: BEX-DOC-2026-0085-1FGZJE5K-9OAQ0ZO0NZJWALJQJB4UWP', '::1', '2026-09-21 15:11:34'),
(415, 85, 'Signature request emailed to Vimal bex (vimal@bexcodeservices.com)', '127.0.0.1', '2026-09-21 15:13:02'),
(416, 85, 'Document \"3 agree 1\" sent for signature (In order · fields visible) to: vimal@bexcodeservices.com', '::1', '2026-09-21 15:13:02'),
(417, 85, 'Vimal bex (vimal@bexcodeservices.com) viewed the document', '::1', '2026-09-21 15:20:04'),
(418, 85, 'Vimal Chavda (vimal@bexcodeservices.com) signed the document', '::1', '2026-09-21 15:20:22'),
(419, 85, 'Signature request emailed to cnv (chavdavimaln@gmail.com)', '127.0.0.1', '2026-09-21 15:20:27'),
(420, 85, 'cnv (chavdavimaln@gmail.com) viewed the document', '::1', '2026-09-21 15:20:43'),
(421, 85, 'cnv (chavdavimaln@gmail.com) viewed the document', '::1', '2026-09-21 15:20:43'),
(422, 85, 'cvn (chavdavimaln@gmail.com) signed the document', '::1', '2026-09-21 15:21:25'),
(423, 85, 'Signature request emailed to yop v (vnc@yopmail.com)', '127.0.0.1', '2026-09-21 15:21:29'),
(424, 85, 'yop v (vnc@yopmail.com) viewed the document', '::1', '2026-09-21 15:21:40'),
(425, 85, 'vnc yop mail (vnc@yopmail.com) signed the document', '::1', '2026-09-21 15:22:37'),
(426, 85, 'All recipients completed \"3 agree 1\". Document marked Completed.', '::1', '2026-09-21 15:22:38'),
(427, 85, 'Completed documents (2 signed PDFs + certificate of completion) emailed to: vimal@bexcodeservices.com, chavdavimaln@gmail.com, vnc@yopmail.com', '127.0.0.1', '2026-09-21 15:22:58');

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
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `user_email` varchar(255) DEFAULT NULL,
  `category` varchar(40) NOT NULL DEFAULT 'system',
  `entity_type` varchar(40) DEFAULT NULL,
  `entity_id` int(11) DEFAULT NULL,
  `details` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `activity_logs`
--

INSERT INTO `activity_logs` (`id`, `user_id`, `action`, `ip_address`, `browser_info`, `created_at`, `user_email`, `category`, `entity_type`, `entity_id`, `details`) VALUES
(44, 1, 'Created role \"Legal Reviewer\"', '127.0.0.1', 'curl/7.78.0', '2026-09-18 18:28:58', 'vimal@bexcodeservices.com', 'permission', 'role', NULL, '{\"key\":\"legal_reviewer\",\"copyFrom\":\"team_member\"}'),
(45, 1, 'Changed 2 permissions of role \"Legal Reviewer\"', '127.0.0.1', 'curl/7.78.0', '2026-09-18 18:28:59', 'vimal@bexcodeservices.com', 'permission', 'role', NULL, '[\"+reports.export\",\"-templates.create\"]'),
(46, 1, 'Changed personal permissions of Dhruv Patel', '127.0.0.1', 'curl/7.78.0', '2026-09-18 18:29:00', 'vimal@bexcodeservices.com', 'permission', 'user', 4, '[{\"key\":\"reports.export\",\"allowed\":true,\"reason\":\"Quarter close\",\"expiresAt\":\"2026-09-19\"},{\"key\":\"templates.create\",\"allowed\":false}]'),
(47, 1, 'Changed personal permissions of Dhruv Patel', '127.0.0.1', 'curl/7.78.0', '2026-09-18 18:29:00', 'vimal@bexcodeservices.com', 'permission', 'user', 4, '[{\"key\":\"roles.manage\",\"allowed\":true}]'),
(52, 1, 'Changed personal permissions of Dhruv Patel', '127.0.0.1', 'curl/7.78.0', '2026-09-18 18:30:55', 'vimal@bexcodeservices.com', 'permission', 'user', 4, '[{\"key\":\"reports.export\",\"allowed\":true,\"reason\":\"Quarter close\",\"expiresAt\":\"2026-09-21\"},{\"key\":\"templates.create\",\"allowed\":false}]'),
(53, 1, 'Changed role of Dhruv Patel to Legal Reviewer', '127.0.0.1', 'curl/7.78.0', '2026-09-18 18:30:55', 'vimal@bexcodeservices.com', 'permission', 'user', 4, NULL),
(54, 1, 'Changed role of Dhruv Patel to Team Member', '127.0.0.1', 'curl/7.78.0', '2026-09-18 18:30:56', 'vimal@bexcodeservices.com', 'permission', 'user', 4, NULL),
(55, 1, 'Deleted role \"Legal Reviewer\"', '127.0.0.1', 'curl/7.78.0', '2026-09-18 18:30:56', 'vimal@bexcodeservices.com', 'permission', 'role', NULL, '{\"movedUsers\":0,\"reassignTo\":\"team_member\"}'),
(56, 1, 'Sent announcement \"TEST broadcast\" to 1 user', '127.0.0.1', 'curl/7.78.0', '2026-09-18 18:31:16', 'vimal@bexcodeservices.com', 'system', NULL, NULL, NULL),
(57, 4, 'Updated notification preferences', '127.0.0.1', 'curl/7.78.0', '2026-09-18 18:31:17', 'dhruv@bexcodeservices.com', 'settings', NULL, NULL, NULL),
(75, 1, 'Updated general settings (default_expiry_days, reminder_frequency_days, default_signing_order)', '127.0.0.1', 'curl/7.78.0', '2026-09-21 09:13:03', 'vimal@bexcodeservices.com', 'settings', 'general_settings', 1, '{\"changes\":[{\"field\":\"default_expiry_days\",\"from\":15,\"to\":21},{\"field\":\"reminder_frequency_days\",\"from\":5,\"to\":3},{\"field\":\"default_signing_order\",\"from\":\"parallel\",\"to\":\"sequential\"}]}'),
(76, 1, 'Updated general settings (default_expiry_days, reminder_frequency_days, default_signing_order)', '127.0.0.1', 'curl/7.78.0', '2026-09-21 09:13:23', 'vimal@bexcodeservices.com', 'settings', 'general_settings', 1, '{\"changes\":[{\"field\":\"default_expiry_days\",\"from\":21,\"to\":15},{\"field\":\"reminder_frequency_days\",\"from\":3,\"to\":5},{\"field\":\"default_signing_order\",\"from\":\"sequential\",\"to\":\"parallel\"}]}'),
(77, 1, 'Signed in', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-21 10:25:38', 'vimal@bexcodeservices.com', 'auth', NULL, NULL, NULL),
(81, 1, 'Verified and confirmed \"VERIFYTEST complete\"', '::1', 'node', '2026-09-21 17:27:05', 'vimal@bexcodeservices.com', 'document', 'document', 94, '{\"integrity\":\"valid\",\"note\":\"Checked against the signed copy.\"}'),
(82, 1, 'Verified and confirmed \"3 agree 1\"', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-22 15:40:50', 'vimal@bexcodeservices.com', 'document', 'document', 85, '{\"integrity\":\"valid\",\"note\":null}');

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
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `key_prefix` varchar(24) DEFAULT NULL,
  `key_hash` char(64) DEFAULT NULL,
  `environment` varchar(20) NOT NULL DEFAULT 'live',
  `last_used_at` datetime DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `revoked_at` datetime DEFAULT NULL,
  `request_count` int(11) NOT NULL DEFAULT 0
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
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `ip_address` varchar(45) DEFAULT NULL,
  `duration_ms` int(11) DEFAULT NULL,
  `user_agent` varchar(255) DEFAULT NULL
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
-- Table structure for table `developer_settings`
--

CREATE TABLE `developer_settings` (
  `id` int(11) NOT NULL,
  `api_enabled` tinyint(1) DEFAULT 1,
  `sandbox_mode` tinyint(1) DEFAULT 1,
  `rate_limit_per_minute` int(11) DEFAULT 60,
  `allowed_origins` text DEFAULT NULL,
  `ip_allowlist` text DEFAULT NULL,
  `webhook_signing_secret` varchar(128) DEFAULT NULL,
  `webhook_retry_count` int(11) DEFAULT 3,
  `webhook_timeout_seconds` int(11) DEFAULT 10,
  `default_callback_url` varchar(500) DEFAULT NULL,
  `log_retention_days` int(11) DEFAULT 30,
  `updated_by` int(11) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `developer_settings`
--

INSERT INTO `developer_settings` (`id`, `api_enabled`, `sandbox_mode`, `rate_limit_per_minute`, `allowed_origins`, `ip_allowlist`, `webhook_signing_secret`, `webhook_retry_count`, `webhook_timeout_seconds`, `default_callback_url`, `log_retention_days`, `updated_by`, `updated_at`) VALUES
(1, 1, 1, 60, NULL, NULL, 'whsec_2666a434ab5db9ba4c1c6f12d04e61dd84eab275d6292c1b', 3, 10, NULL, 30, NULL, '2026-09-21 09:09:05');

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
(34, 1, 'Blank Agreement Document.pdf', '/uploads/completed/34/01-Blank-Agreement-Document.pdf', 'None', 'Completed', 'sequential', 'vimal@bexcodeservices.com', NULL, NULL, 5, 15, NULL, '2026-09-16 18:33:51', '2026-09-16 12:54:23', '2026-09-16 13:03:51', '2026-09-16 18:29:11', 'Others', NULL, 'Forever', 1, 0),
(35, 1, 'My first document', '/uploads/sample.pdf', 'None', 'In Progress', 'sequential', 'vimal@bexcodeservices.com', NULL, NULL, 5, 15, NULL, '2026-09-16 18:56:32', '2026-09-16 13:19:02', '2026-09-16 15:07:58', '2026-09-16 18:55:23', 'Others', NULL, 'Forever', 1, 0),
(41, 1, 'doc 2', '/uploads/sample.pdf', 'None', 'Draft', 'sequential', 'vimal@bexcodeservices.com', NULL, NULL, 5, 15, NULL, NULL, '2026-09-16 17:29:51', '2026-09-16 17:30:01', NULL, 'Others', NULL, 'Forever', 1, 0),
(42, 1, 'doc-2', '/uploads/completed/42/01-doc-2.pdf', 'None', 'Completed', 'sequential', 'chavdavimaln@gmail.com', NULL, NULL, 5, 15, NULL, '2026-09-17 00:37:26', '2026-09-16 17:34:34', '2026-09-16 19:07:26', '2026-09-16 23:12:28', 'Others', NULL, 'Forever', 1, 0),
(47, 1, 'Document 1.pdf', '/uploads/sample.pdf', 'None', 'Draft', 'parallel', 'chavdavimaln@gmail.com', NULL, NULL, 3, 30, NULL, NULL, '2026-09-16 19:05:52', '2026-09-16 19:06:12', NULL, NULL, NULL, NULL, 1, 0),
(48, 1, 'sign 1', '/uploads/completed/48/01-sign-1.pdf', 'None', 'Completed', 'sequential', 'vimal@bexcodeservices.com', NULL, NULL, 5, 15, NULL, '2026-09-17 18:50:04', '2026-09-17 12:11:59', '2026-09-17 13:20:05', '2026-09-17 18:39:34', 'Others', NULL, 'Forever', 1, 0),
(49, 1, 'vimal 1', '/uploads/completed/49/01-vimal-1.pdf', 'None', 'Completed', 'sequential', 'vnc@yopmail.com', NULL, NULL, 5, 15, NULL, '2026-09-17 20:00:32', '2026-09-17 13:48:21', '2026-09-17 14:30:33', '2026-09-17 19:57:58', 'Others', NULL, 'Forever', 1, 0),
(52, 1, 'doc 1 vimal', '/uploads/sample.pdf', 'None', 'In Progress', 'parallel', 'vnc@yopmail.com', NULL, NULL, 5, 15, NULL, NULL, '2026-09-17 15:29:27', '2026-09-18 08:14:59', '2026-09-18 13:44:59', 'Others', NULL, 'Forever', 1, 0),
(60, 1, 'document 1', '/uploads/completed/60/01-document-1.pdf', 'None', 'Completed', 'sequential', 'vnc@yopmail.com', NULL, NULL, 5, 15, NULL, '2026-09-18 13:33:33', '2026-09-18 06:17:20', '2026-09-18 08:03:39', '2026-09-18 12:05:26', 'Others', NULL, 'Forever', 1, 0),
(63, 1, 'my doc 101', '/uploads/sample.pdf', 'None', 'In Progress', 'sequential', 'vnc@yopmail.com', NULL, NULL, 5, 15, NULL, NULL, '2026-09-18 12:08:35', '2026-09-22 18:19:09', '2026-09-21 20:04:45', 'Others', NULL, 'Forever', 1, 0),
(65, 1, 'agreement', '/uploads/sample.pdf', 'None', 'In Progress', 'sequential', 'vimal@bexcodeservices.com', NULL, NULL, 5, 15, NULL, NULL, '2026-09-18 13:12:49', '2026-09-21 13:26:24', '2026-09-21 18:56:24', 'Others', NULL, 'Forever', 1, 0),
(67, 1, 'vimal 1 (Copy)', '/uploads/sample.pdf', 'None', 'Trashed', 'parallel', 'vnc@yopmail.com', NULL, NULL, 5, 15, NULL, NULL, '2026-09-18 18:31:57', '2026-09-21 09:14:07', NULL, 'Others', NULL, 'Forever', 1, 0),
(68, 1, 'Employment Agreement.pdf', '/uploads/sample.pdf', 'None', 'Trashed', 'parallel', 'vimal@bexcodeservices.com', NULL, NULL, 5, 15, NULL, NULL, '2026-09-21 12:31:39', '2026-09-21 14:36:45', '2026-09-21 18:54:34', 'Others', NULL, 'Forever', 1, 0),
(85, 1, '3 agree 1', '/uploads/completed/85/01-3-agree-1.pdf', 'None', 'Completed', 'sequential', 'vimal@bexcodeservices.com', NULL, NULL, 5, 15, NULL, '2026-09-21 20:52:38', '2026-09-21 15:11:33', '2026-09-21 15:22:43', '2026-09-21 20:42:56', 'Others', NULL, 'Forever', 1, 0),
(101, 1, 'my sign doc 1.pdf', '/uploads/completed/101/01-my-sign-doc-1.pdf', 'Sign Yourself', 'Completed', 'parallel', 'vimal@bexcodeservices.com', NULL, NULL, 3, 30, NULL, '2026-09-22 19:44:48', '2026-09-22 14:14:08', '2026-09-22 15:28:59', '2026-09-22 19:44:48', 'self-sign', 'Self-signed document (Sign yourself)', 'Forever', 1, 0);

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
(223, 42, 37, 1, 'Signature', 'Signature', NULL, 1, 60, 533, 200, 70, '{\"value\":\"Signature\",\"docIndex\":0,\"assigneeId\":37,\"assignee\":\"Vimal Chavda\",\"assigneeEmail\":\"vimal@bexcodeservices.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"textColor\":\"#00a884\",\"clientId\":1789580092541,\"signatureImage\":\"data:image/png;base64,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\",\"signatureStyle\":\"font-signature-1\",\"signerName\":\"Vimal Chavda\",\"signerEmail\":\"vimal@bexcodeservices.com\",\"signedAt\":\"2026-09-16T19:07:25.377Z\"}'),
(224, 42, 37, 1, 'Job title', 'Job title', NULL, 1, 60, 587, 160, 40, '{\"value\":\"hghg\",\"docIndex\":0,\"assigneeId\":37,\"assignee\":\"Vimal Chavda\",\"assigneeEmail\":\"vimal@bexcodeservices.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"textColor\":\"#00a884\",\"clientId\":1789580099197,\"signerName\":\"Vimal Chavda\",\"signerEmail\":\"vimal@bexcodeservices.com\",\"signedAt\":\"2026-09-16T19:07:25.377Z\"}'),
(225, 42, 37, 1, 'Sign date', 'Sign date', NULL, 1, 60, 641, 160, 40, '{\"value\":\"Sep 17, 2026\",\"docIndex\":0,\"assigneeId\":37,\"assignee\":\"Vimal Chavda\",\"assigneeEmail\":\"vimal@bexcodeservices.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"textColor\":\"#00a884\",\"dateFormat\":\"MMM dd yyyy HH:mm z\",\"clientId\":1789580104852,\"signerName\":\"Vimal Chavda\",\"signerEmail\":\"vimal@bexcodeservices.com\",\"signedAt\":\"2026-09-16T19:07:25.377Z\"}'),
(226, 42, 38, 1, 'Company', 'Company', NULL, 1, 475, 530, 160, 40, '{\"value\":\"Bexcode Services\",\"docIndex\":0,\"assigneeId\":38,\"assignee\":\"vnc\",\"assigneeEmail\":\"chavdavimaln@gmail.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"textColor\":\"#0284c7\",\"clientId\":1789580349885,\"signerName\":\"vc\",\"signerEmail\":\"chavdavimaln@gmail.com\",\"signedAt\":\"2026-09-16T18:43:59.958Z\"}'),
(227, 42, 38, 1, 'Checkbox', 'Checkbox', NULL, 1, 399, 534, 160, 40, '{\"value\":\"true\",\"docIndex\":0,\"assigneeId\":38,\"assignee\":\"vnc\",\"assigneeEmail\":\"chavdavimaln@gmail.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"textColor\":\"#0284c7\",\"checked\":false,\"clientId\":1789580435957,\"signerName\":\"vc\",\"signerEmail\":\"chavdavimaln@gmail.com\",\"signedAt\":\"2026-09-16T18:43:59.958Z\"}'),
(228, 42, 37, 1, 'Sign date', 'Sign date', NULL, 1, 497, 531, 160, 40, '{\"value\":\"Sep 17, 2026\",\"docIndex\":1,\"assigneeId\":37,\"assignee\":\"Vimal Chavda\",\"assigneeEmail\":\"vimal@bexcodeservices.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"textColor\":\"#00a884\",\"dateFormat\":\"MMM dd yyyy HH:mm z\",\"clientId\":1789580143549,\"signerName\":\"Vimal Chavda\",\"signerEmail\":\"vimal@bexcodeservices.com\",\"signedAt\":\"2026-09-16T19:07:25.377Z\"}'),
(229, 42, 37, 1, 'Signature', 'Signature', NULL, 1, 497, 595, 200, 70, '{\"value\":\"Signature\",\"docIndex\":1,\"assigneeId\":37,\"assignee\":\"Vimal Chavda\",\"assigneeEmail\":\"vimal@bexcodeservices.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"textColor\":\"#00a884\",\"clientId\":1789580152500,\"signatureImage\":\"data:image/png;base64,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\",\"signatureStyle\":\"font-signature-1\",\"signerName\":\"Vimal Chavda\",\"signerEmail\":\"vimal@bexcodeservices.com\",\"signedAt\":\"2026-09-16T19:07:25.377Z\"}'),
(275, 47, NULL, 1, 'Signature', 'Signature', NULL, 1, 60, 533, 200, 70, '{\"value\":\"Signature\",\"docIndex\":0,\"assigneeId\":1,\"assignee\":\"Vimal Chavda\",\"assigneeEmail\":\"chavdavimaln@gmail.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"clientId\":1789585573703}'),
(276, 47, NULL, 1, 'Sign date', 'Sign date', NULL, 1, 60, 587, 160, 40, '{\"value\":\"Sign date\",\"docIndex\":0,\"assigneeId\":1,\"assignee\":\"Vimal Chavda\",\"assigneeEmail\":\"chavdavimaln@gmail.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"dateFormat\":\"MMM dd yyyy HH:mm z\",\"clientId\":1789585585807}'),
(339, 48, 47, 1, 'Signature', 'Signature', NULL, 1, 60, 669, 200, 70, '{\"value\":\"Signature\",\"docIndex\":0,\"assigneeId\":47,\"assignee\":\"Vimal Chavda\",\"assigneeEmail\":\"vimal@bexcodeservices.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"clientId\":1789650401646,\"signatureImage\":\"data:image/png;base64,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\",\"signatureStyle\":\"font-signature-1\",\"signerName\":\"Vimal Chavda\",\"signerEmail\":\"vimal@bexcodeservices.com\",\"signedAt\":\"2026-09-17T13:17:46.753Z\"}'),
(340, 48, 48, 1, 'Signature', 'Signature', NULL, 1, 455, 666, 200, 70, '{\"value\":\"Signature\",\"docIndex\":0,\"assigneeId\":48,\"assignee\":\"v n c\",\"assigneeEmail\":\"chavdavimaln@gmail.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"clientId\":1789650406902,\"signatureImage\":\"vc\",\"signatureStyle\":\"font-signature-1\",\"signerName\":\"vc\",\"signerEmail\":\"chavdavimaln@gmail.com\",\"signedAt\":\"2026-09-17T13:20:04.014Z\"}'),
(341, 48, 48, 1, 'Company', 'Company', NULL, 1, 464, 737, 160, 40, '{\"value\":\"Bexcode Services\",\"docIndex\":0,\"assigneeId\":48,\"assignee\":\"v n c\",\"assigneeEmail\":\"chavdavimaln@gmail.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"clientId\":1789650411750,\"signerName\":\"vc\",\"signerEmail\":\"chavdavimaln@gmail.com\",\"signedAt\":\"2026-09-17T13:20:04.014Z\"}');
INSERT INTO `document_fields` (`id`, `document_id`, `recipient_id`, `page_number`, `field_type`, `label`, `description`, `is_required`, `pos_x`, `pos_y`, `width`, `height`, `options`) VALUES
(342, 48, 47, 1, 'Signature', 'Signature', NULL, 1, 60, 533, 200, 70, '{\"value\":\"Signature\",\"docIndex\":1,\"assigneeId\":47,\"assignee\":\"Vimal Chavda\",\"assigneeEmail\":\"vimal@bexcodeservices.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"clientId\":1789650436726,\"signatureImage\":\"data:image/png;base64,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\",\"signatureStyle\":\"font-signature-1\",\"signerName\":\"Vimal Chavda\",\"signerEmail\":\"vimal@bexcodeservices.com\",\"signedAt\":\"2026-09-17T13:17:46.753Z\"}'),
(343, 48, 47, 1, 'Full name', 'Full name', NULL, 1, 60, 587, 160, 40, '{\"value\":\"Vimal Chavda\",\"docIndex\":1,\"assigneeId\":47,\"assignee\":\"Vimal Chavda\",\"assigneeEmail\":\"vimal@bexcodeservices.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"nameFormat\":\"Full Name\",\"clientId\":1789650440022,\"signerName\":\"Vimal Chavda\",\"signerEmail\":\"vimal@bexcodeservices.com\",\"signedAt\":\"2026-09-17T13:17:46.753Z\"}'),
(344, 48, 47, 1, 'Sign date', 'Sign date', NULL, 1, 60, 641, 160, 40, '{\"value\":\"Sep 17, 2026\",\"docIndex\":1,\"assigneeId\":47,\"assignee\":\"Vimal Chavda\",\"assigneeEmail\":\"vimal@bexcodeservices.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"dateFormat\":\"MMM dd yyyy HH:mm z\",\"clientId\":1789650442286,\"signerName\":\"Vimal Chavda\",\"signerEmail\":\"vimal@bexcodeservices.com\",\"signedAt\":\"2026-09-17T13:17:46.753Z\"}'),
(345, 48, 48, 1, 'Company', 'Company', NULL, 1, 479, 539, 160, 40, '{\"value\":\"Bexcode Services\",\"docIndex\":1,\"assigneeId\":48,\"assignee\":\"v n c\",\"assigneeEmail\":\"chavdavimaln@gmail.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"clientId\":1789650451566,\"signerName\":\"vc\",\"signerEmail\":\"chavdavimaln@gmail.com\",\"signedAt\":\"2026-09-17T13:20:04.014Z\"}'),
(346, 48, 48, 1, 'Email', 'Email', NULL, 1, 484, 597, 160, 40, '{\"value\":\"chavdavimaln@gmail.com\",\"docIndex\":1,\"assigneeId\":48,\"assignee\":\"v n c\",\"assigneeEmail\":\"chavdavimaln@gmail.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"clientId\":1789650458790,\"signerName\":\"vc\",\"signerEmail\":\"chavdavimaln@gmail.com\",\"signedAt\":\"2026-09-17T13:20:04.014Z\"}'),
(347, 48, 48, 1, 'Checkbox', 'Checkbox', NULL, 1, 426, 596, 160, 40, '{\"value\":\"true\",\"docIndex\":1,\"assigneeId\":48,\"assignee\":\"v n c\",\"assigneeEmail\":\"chavdavimaln@gmail.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"checked\":true,\"clientId\":1789650564726,\"signerName\":\"vc\",\"signerEmail\":\"chavdavimaln@gmail.com\",\"signedAt\":\"2026-09-17T13:20:04.014Z\"}'),
(460, 49, 50, 1, 'Email', 'Email', NULL, 1, 482, 527, 160, 40, '{\"value\":\"chavdavimaln@gmail.com\",\"docIndex\":0,\"assigneeId\":50,\"assignee\":\"vnc\",\"assigneeEmail\":\"chavdavimaln@gmail.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"clientId\":1789652964607,\"signerName\":\"vc\",\"signerEmail\":\"chavdavimaln@gmail.com\",\"signedAt\":\"2026-09-17T14:30:31.489Z\"}'),
(461, 49, 50, 1, 'Full name', 'Full name', NULL, 1, 490, 596, 160, 40, '{\"value\":\"vnc\",\"docIndex\":0,\"assigneeId\":50,\"assignee\":\"vnc\",\"assigneeEmail\":\"chavdavimaln@gmail.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"nameFormat\":\"Full Name\",\"clientId\":1789653166975,\"signerName\":\"vc\",\"signerEmail\":\"chavdavimaln@gmail.com\",\"signedAt\":\"2026-09-17T14:30:31.489Z\"}'),
(462, 49, 50, 1, 'Split text', 'Split text', NULL, 1, 514, 660, 16, 20, '{\"value\":\"s-12345---\",\"docIndex\":0,\"assigneeId\":50,\"assignee\":\"vnc\",\"assigneeEmail\":\"chavdavimaln@gmail.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"charCount\":10,\"charSpace\":0,\"gridValue\":[\"s\",\"-\",\"1\",\"2\",\"3\",\"4\",\"5\",\"-\",\"-\",\"-\"],\"clientId\":1789653366719,\"signerName\":\"vc\",\"signerEmail\":\"chavdavimaln@gmail.com\",\"signedAt\":\"2026-09-17T14:30:31.489Z\"}'),
(463, 49, 51, 1, 'Signature', 'Signature', NULL, 1, 68, 543, 200, 70, '{\"value\":\"Signature\",\"docIndex\":0,\"assigneeId\":51,\"assignee\":\"vnc yop mail\",\"assigneeEmail\":\"vnc@yopmail.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"clientId\":1789654282160,\"signatureImage\":\"vnc yop mail\",\"signatureStyle\":\"font-signature-2\",\"signerName\":\"vnc yop mail\",\"signerEmail\":\"vnc@yopmail.com\",\"signedAt\":\"2026-09-17T14:29:42.721Z\"}'),
(464, 49, 51, 1, 'Checkbox', 'Checkbox', NULL, 1, 60, 533, 160, 40, '{\"value\":\"true\",\"docIndex\":1,\"assigneeId\":51,\"assignee\":\"vnc yop mail\",\"assigneeEmail\":\"vnc@yopmail.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"checked\":true,\"clientId\":1789654322704,\"signerName\":\"vnc yop mail\",\"signerEmail\":\"vnc@yopmail.com\",\"signedAt\":\"2026-09-17T14:29:42.721Z\"}'),
(465, 49, 50, 1, 'Full name', 'Full name', NULL, 1, 494, 527, 160, 40, '{\"value\":\"cvn\",\"docIndex\":1,\"assigneeId\":50,\"assignee\":\"cvn\",\"assigneeEmail\":\"chavdavimaln@gmail.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"nameFormat\":\"Full Name\",\"clientId\":1789654367400,\"signerName\":\"vc\",\"signerEmail\":\"chavdavimaln@gmail.com\",\"signedAt\":\"2026-09-17T14:30:31.489Z\"}'),
(466, 49, 50, 1, 'Company', 'Company', NULL, 1, 500, 596, 160, 40, '{\"value\":\"Bexcode Services\",\"docIndex\":1,\"assigneeId\":50,\"assignee\":\"cvn\",\"assigneeEmail\":\"chavdavimaln@gmail.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"clientId\":1789654371952,\"signerName\":\"vc\",\"signerEmail\":\"chavdavimaln@gmail.com\",\"signedAt\":\"2026-09-17T14:30:31.489Z\"}'),
(569, 60, 75, 1, 'Signature', 'Signature', NULL, 1, 60, 533, 200, 70, '{\"value\":\"Signature\",\"docIndex\":0,\"assigneeId\":75,\"assignee\":\"vimal yop\",\"assigneeEmail\":\"vnc@yopmail.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"clientId\":1789712301288,\"signatureImage\":\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQkAAABmCAYAAADYvWRfAAAQAElEQVR4Aex9CXxcVfX/Oe/NpOmSmaS2mSlUqSzSTAoiFQTZ+nOXRVARBX4gyOICyiarIH+VnwIKyOYPWf6iPzf8AQriXxAQ3JBFFKFJWq1QFdpMWpuZpE2aZN47/+95M2/yZua9dJqksS13Pve8u527vHPvPffcc++7Y5H5GQoYChgKjEEBwyTGII6JMhQwFCAyTML0AkMBQ4ExKWCYxJjkMZGGAlNLga2xNMMktsZWMXUyFNiKKGCYxFbUGKYqhgJbIwUMk9gaW8XUyVBgK6KAYRJbUWOYqkwtBUxp9VHAMIn66GSwDAVetRQwTOJV2/TmxQ0F6qOAYRL10clgGQq8ailgmMSrtumn9sVNadsuBQyT2HbbztTcUGBKKGCYxJSQ2RRiKLDtUsAwiW237UzNDQWmhAKGSUwJmae2EFOaocBkUsAwicmkpsnLUGA7pIBhEttho5pXMhSYTAoYJjGZ1DR5GQpshxQwTGKCjWqSGwps7xQwTGJ7b2HzfoYCE6SAYRITJKBJbiiwvVPAMIntvYXN+xkKENmJdNthiXTmN8nWzLJkqu3DIAoD6jLbFJOo640MkqGAoUCZAjPnZtLJVOYhFn6AhQ4kpt2J+DtNrQv3ozp/hknUSSiDZiiwrVGgeV7bTrZFj6DebwcETYNF1p7BgLHchkmMRR0TZyiwjVKgpWXnpLh8B9YU7f4rwP1dS6w3wt8N90zYdRnDJOoik0EyFNimKMDutGkfR42DEsSjPLzxTI5b6xDuMPNfYddlIplEXakNkqGAocBWR4HZ6UyGhM8PVCwnTJf09r6Yl+HCAoQ7IxavgF2XMUyiLjIZJEOBbYUCS2KO8Dmo7RyAZ6CwvKKvu/Np9bg2HwD7pekF95+w6zKGSdRFJoNkKLBtUKBlXs/+RHJCoLa/igt9U/2qpyCR9xPzz9es6VyvYfWAYRL1UMngGAr8uylQR/nz58+fLq5cANQGgBoXTOG/fIbgxKaDgVBaHLpHI+sFwyTqpZTBMxTYyinQP9x0oBAfGqjmPfmeGY+rXxmIZblnsMgDfWs6/qZh9YJhEvVSyuAZCkwxBRLp9n2SqUwXQJKptof0YFRUFZQJMNNnEO+P6WHLohuJnh1BGG1wEm8m4sViy7cI6xFA3cbPsO4EBtFQwFBgy1MgMbd9V0vkPpS0EADD74rb9Ak4Qk2IFHFf7+rpTxaRF8ddlz4NKeNX+dXpPxfD6n8aJlE/rQzmq4UCW8F7MsvbhWhesCoiFA/6ffempIiWeYN6BHuJK84NRI8X/HT12oZJ1Espg2coMIUUYObVVcXl2KW7q8I8b3541l5C/C7PU3yUpQhlIEVlJt/f35N+phi9eU/DJDaPXgbbUGBKKJDLNv4cSsabS4UtY3aPyq3p/FPJH7CWxCy2VRcR3NG4zddFrB9ufi8YyAFkOf89HilCCzJMQqlgwFBgq6PAsyO5nq4z89lOBrTlupf9KqyKLaksdBbynnIc08NNDf2/VX/TjgtfI+xeBCbxnfzqZX/UsPGAYRLjoZpJM3kUMDlNiALCfDQyaAaoEXH46y+//PKgeizHPpWJ5pNLN8EvgHGZrYpJNKcXHoLtHm/LJ5HOXIM3wjviaYyhgKFADQVmti5KQZmpF8j4cU/bhcHfq2d2OtNOIuci/ot9azrq/k5D01bDlmYS9uwd95zfkmo/ItGaOb55bmav6gr4fjCFfUWsn8AP8YkI3GEnoiU2/ft+dlProrcmU+0/TKYy6wHYq84orERdzyRaHKpp3tzqzt5h0Wub0+0fTabbv4G98FsVmlvbjorKR/ETqbaPNKcyN3i4qcyNza3t+vlvVJJS+OI4yjg6mco8BXAA+i5Z5PG5VGrPMT8bnj1710Qi3XZoQtswlbkhkW7/diLVfl1Ly87JUuYVlrY58r8LoOUo/KxpzsI3VCBtfx7Wd0y2tl+F914BUPoq6Ps/39yaOU/pOMZr2y3zMgcl0+1HK3h9orXtnap4jEpjs/MfiPPGC2zwBLqpt/fFvKZxRa4UoeXWyMYfaNxEwJpI4rHStqQW7gFCveQUCv90Se5npu+6Nt04Z87uTdXp5s7NzGKhqxHui00EEenhsRQtXoOkMr9HGdoQPclU261NGNTII9Roh062LnpXc+uiD9Cuu04LRSoF+nlb7P6OSMCp+Qlx+b12LPZa+G9DXW9IpgexnbQkVkoyLgsd6oOO464UkTvRwp8k4tOIaQXWoj+lkF8indkX+M8z8Q+E6NNEfIoIP57r6Rhz7zvhHcoZ7EIZ/0tE+wL8dm8l4is2UuG+logBT/itW7eij4UP0DbUcqFQO5FJTncbG3ZFdNAwGNyJaPMHWKy7HMtaBPwHgHCoZVtPJVB/uCfFqNSZSGWWov3dBJhWc/NezZTJ+Mq7SSmj3kxmpdszqMcTeMflxN6x6F2Q9h/Ccoa4stAiOQ7LgoVOvGF5MtX+NsSFGcdxaCevjUT+1+sTzL/YMJJ8RxiyMgJmPikQt8whC2OGqG848UEhfg/a6Eu9YBoBnHE5/c4yrsRjJerNLnuBiVQyIP/HQq8bIGuW7/ftIeID4T4Y4JucxYIB6nsr7eZ5bTuhQbTz6f6vRr4Gj0f7e5Z6ohbcZeM1YDrzc7ehMUfsPiSW7EYrVgyVESodnExnPoS8lyJ4H8AAEx+Zz3a8GyLbg+teef5l13a+yUQYcHTMrHlrdwPOuMzsNMRBlluQuNwGaNjr891dX0WYA6gw2ikskcsQOMpIWS7O93Tci7Aow83pzEkY1E8CYRfCA2YEjOXyuOPsONOePpPEO6BziBtvPBZxkcYi1jyC8TMg+YHJlIM4kc6cIWwd3EixA3I9S+9dv3ppl03yOWDkAM3sfZ04McaKfAjleFIn2kEvVGG834kybeRr8/v6KiRPr+1TmZ8lUxmdzVeMJclqvgDWNInWzLeQZr3am5AYbTCqz9gizyGt3xdHiOXCpnjfwr7urm/0ren6a2+2ayn60OlMfLtOMrpMAH6NYdvtQuAAwDegm/uS7wna/c6sDNruID+Mme7a0LM0q/0K7uuE+OZ8T5feSuWjjNu2xp2yjoTgnq9UoklPfEZsY2UYkWXJoQhjQNEwPTUz3h96vlwHC6QMVcSUBygIcmM+2/UjJBaAZ4oib/u9aMAOENPT/iKywxFbj6V6OFUPHVAfBe4PER4H5Fyx3pnLdtwPN5LiCeMWGmx4GuGcHXeleiZFcF2GXVcgOVD5c16kWhGzWfUwyB6+KtNfey7/Vw0OfwNoofgIZ4i454qQvq/fzmtdcQ/p6+n44tq1y1etWvXsQL6n9Q4ivpuYTmoZQ5qg2t8As9vjBydb2z9gCe2ezzZ+Mpt9foMfPuTQv+DuA8DIQbN3XJeGY9ymKHXyFchglFkSPWoND57nK+x0YCfTbReg7V8AnvYtff9dxGIsExFSa7ilddGeYAxPIE0HBpnO0IMxi77mbyVWJ0lhiQYmcjs67fWI0/4Ci/6JPn8AGP3Vo3XRYA+E2LkD7XH5hp5pevGLFxh8iMvap2eMhvGDvdnUslH/qIvFOgI+HzcHRnm3tp8jpPV5SWLOlxAvgAkbJd6EM6k/A843DvFwED/5uj1ahES/TisH480eCCGyF99XFKUO9zzFxzNVBPG4O0TeF8G1319EKT2Frlyffb7csUuhnqWdHA2IAUNKE5eET4Vk8oQXGXjE7MJ8eLWj9wP/H3BvtmlJtbWjMx1fkVDomnWrloZ+46+MER1X98K1bl4y0OyWNWN87uu9D3tLOA8fD7145LD+nmVV0tbjBRFRqSwj8ekLgBdqgKMdOBi30aGYN+sldBnB8mEe3nhp1KAqJWxx3OFUyT0ua5jpP9Gu7/QTY5CuxuD6RG9JrG4Bo0u2Dn4f7XcVcMr0gpuY5WW1g1CaTO5x2dUlmy8NkBB/b113Z2cQ13crgxiiwi1oE2UmfvCLWF69u6+74xk/oNrGNubKvp7O74bSaMGCRiY+IZBGxKVvE9WekPTGjMhho7jKTGYsd4u3Ue0tTGf2v7JMmfMoygRcFUScQD6hSYUoUxnBK4OzjBc3RC1ErAOPSr8cuLn35VrJX7ZmpfZsJaaLygFE+hHLeT5Big2eeYiJlJv63N1Hf0bi7s99T9DWc/LoQDcizKOHEN8YIcYzu7YqFZWD/zEuEirtIJ+xDAtZ0HNQeSYUog6HY/dSxK+/VopYBonosQh0TxyHyAvR1mN4iuYxvb7SxSMaEASbWWf6JteSHYLhFW6mCgYCGnczD6/xln5C1wrT13pLA5UCvwbLaoW3BTBh44npTGcFM3KFLsBS0NPea/u7DdMeIaajgzgltzfbltxq2c2pzMfCJhO822pySaVVNI2iBmFxfCONQJxXZlUOVwZxuC6vyiElhzKUZKr99mQqIx60ZpZpudX6k5bB6bsiyVsBvinvVPgBZXuosJiIAaQ/UWaSbN34PhK+HHBaVDvTOH/eoBhn2jGTKbdjcSuZhEgNlxV2VZ8Q1JI/0Tt90Gv06gJsKXwADdjuhwvxf/eu7vyt+pNQCKHB7yTiL/NQQws6rRdOpR9m3mt9ZlIK8iydpS3L1UafpwGCAeuS/WW4BVBhdE2LfFRk1Vn5grFmcqpIOepJpnZfgDxOHg2BawwJR+uHGatCioDfW38iZY1pwUzKQlr/ABOKZHoV6W3hUEWsivggRsXtyqBvVxM1DYjLF5PQj6M6JrjTIhTSBFBTlj7Us7kQs+QkpClr85nkgURDn3c3gjL6QqHwIBG/kYjWAKqMzrZF0V2ZSTKVeUiIbkB/WluFSMJ8vc94quMgpZxCqmCm8k/7wrFhDAIYPEQOJjVBGvjUML0Miese6uyskKhRpjK2QJvJ13tDmG4xC34fbFQdT5Jn9YlJ4TbAFyImNw9lvI8txiTcjSNoTA52rAGy3T9UV9QWUtF9uh+OAfQ/tHJljd4iZBZ50WLn65oukW77lIqgUBYdAQXRLyXhMIs0alwJnrKHh0KliNKxVV90g17T+nzYksQbKBZ7IqwwHRc1KErlRVrCtpa1o4+AjtrhcuwXvr/a7htKHiLEmsaPqp4R/XDPLikggxegRuo69J1owYIgnbw8qh9YnGNXh/aoDOdnNjgDui5+rX/zUWW8+pbEmLm8NESv9qQPjdlcmI2tYmj+Tw2ky5HLn9dlaSLdvg9b8jA682P2yPAcOxbbG3hBfRgkToH+5vFCsjiZPIal4p357PSWuEu6NRs8zbjCtvj7SF9jMEm8iZi+EogAD+RTo/pCy7zMgejPegmMn0QZyiXVg18nVKlYPlCkpNi0wxtUj1VuX/SNVXj3m9H/7853z7gOBQlgUg3oOqn5+ZmxTaxr7gY/AC/RSfE49ASjISGuv8cLzm9Cwsm23A8hHIwHTzVCX811z3wl0dp+GQsn8tnOS7XDeFEbHQwqfrO6FdBQoVy5BbMuJBltRPRfxaRfx8X9heeqeqjUp8k7KQAAEABJREFUwEPxY/LTB1LoFKEMpypJjVcZHQudURHBdEsYU1IcHcToAJiJyK8fgkdnRHgqjOYPzApxnCJ0Hc3YCh62aF1ycEafS64qAgcdpu6KDEsey3F10M0uedUCnxTodvg8y6IrlTYaWA3VR4axNHi6f9Vf/lWNV4/fceU44O0K8AwT35Rb0/kcJojDMCH8GP6zctnOz6zDdm1h2FkEpODS6b7emcNPJ7FzReRe5VjW+3zdQMESXUap9IEkRHix68N0QyrRkSVfBFIzoGTkjnxPoyq2S/5RS/Gl8pYoTPR0BfrO06NYRZcMum+h0eWD1uHmDdipoJBfbCS2UMhjbF4sE72PhP5oDQ+dH6rr8LAm9tgiTMITqZl17V6uHRP/Pv+PF3rLASEONPYD//rXX1ZVR2nnrxpczxSEfpJMD36ZLXcQDEJneEfT6YzDTJeruwSRUoTTMO29wEED4QkDZjKmMjCXey4XJuUgaV3Grjr8gkQrYpaldwbAWWuGmJSGh1DgJ+QCv1aZpSg1jJRoWYGsH2tcEJT5gDnqEkb1NgBWiW9dzLZXB/GK7kppwAsT+ou4dKgQP+Ev97zwqodUHhnW2EfwEMBmGW3TKiliBVku1vltx7DwdezS4bnyLhTqa9FHUQAD1AwA96pk37TDSfi0gstHjC4NFscd4fOA5A/8ZY5r6VkSBFWavpGmI4VGpSIh6JEoHqmorZJQNbNnnLiL5bA6g1BT31dYnJ8FMYJu1yLts6PLQqG7rZGNp/ZGLE2Cacfr3iJMwrVJJQh0PvJ/kO4klONiFhsEEmhOww7J90puWL5ZEouxDgwqSxFgJjfFbDmRhJogYn2dCK4iOhcc0UYvzzgo+KYwAibmz5/NxGcXk3nPZY7YkcpAD6PqobMFRNC9EMyAsc2CBdXaawIz+17YrKUZhShpNTiyjjrwUYmPKZIPyD9Ud7FBRHUEr/fxSvaf18X7atbnydeu3UlEdPmnbVREZZpOTHtRpHKPSHUEaJXTafT3CrPzxKi3flfBdY8E9q6AooF0JI4FSZEvh1RwpEoUxQii5LxuSAWia3YviImvJbF2Rn0/XnDlxA1rOsvSUnNq43tBoxM9RH0w3xk2gzc3L2hGPufS6A9jlS+JkgD9D6uAzgA1wmJd2R+y45BM/et16L5LFEkBffsn+ezylequhtJBRN3S9aKY+GeNHDupdxMMIjG/fXbLDhmU4yXb7McWYRL9q+b9jYh/SaO/p63hoRqlpUY7lq1rx14ooX6RbFj/nIYFIblDVo+e6kD0gjHof4MZaj4JH2INb7yQqHg9l0Ym5y3cG/mcpu4SLPNPoZX8ZUsKCXS80SUJEz0c1kHKCUIcOlu4Np9DVMfx8ZUrh9AZvoNsvMHGRKtdh7EdhpAQA6njZOC0IaoA8Aw60KOoI8R8z1vxGLLlEBIq04mIInUXM8hdL0yV27fMv6aVtbogHnFPgIJH9RaoDvm/1xHz7VHKPSAxWXQmXnQelX6oe2TnL6GEWtVSJPLsAPQTy1fwDieNSgWafEmMXFvPn+jukwaswOh8noXOgsR5WpBBeAOZBJIAaqqYRJG6CGmcrn1KD9cVMYnu0U+5fU+1bY1YujQO4j/NIwOPVuOpX9jR5Wda3YCIiRIxMCOWtR8sXUrB8syt2cCZFC8k7FGQ48SligkkDC0qbIswiRruyPRgFLezCo4OgkHXtW72dQqjlV0cpwJfCf80gBphS6C5xp68JZ+qzLOmgxA6UcTabgkU5YTOJLZmChChcEkHcaFm/vz5mE2dk8mhHxCFi//BhMCHJEHY46fiYBO5F4MMzDSIVXTrLIxBdRYTq+5jfTGUBO/zE7gxRvCsNsIfQRADfBO5S7R27fL1kAKCO0g5S9waEXc2lIWuS29jYsfPVG1UYKxDaZRIZfZlEh1Yiq4wZudXhCiIkatnXUalSKLfMbZb0bgXV6/va6+Tl8eUQbhM5+ZWd/09WAaPWCq2lwcy8oyQ6tAHhT8WSDugy5fg5BSIo+b0wgVo4fODYehboTqxpqaFr0H9dGlURGd6LGyiLEbiydYpePpLjb/bhZHizgYCo4wyWbQ1lmVydxTOpsK3CJMQcfRwlM8dB4Td0G8RUDm2LOtE2DuC8P66EF7PcCK94WIQXM/BewF4oO/xwcJ8WnWjl5RkHwSObyLXdk07dmvnCB4OWmXH4sv8hPXYfdh1ULzEtHxQM65BoaD4MrpLkUOnvAWIAqgy6JQsn0NEHp3rBUR6dGGiLtd2aiQtxFNz84JmNGRZ4036E7o/TDLQKACy5rs8Gw+iUGUou46cbjH/AXVZTMHfGFu2LVAGo67/BXR/NoeT7uvvmVmzs6URY4HmRUwn0ehvEM5jIUVcV7vVV7zHEfG61IVF64T4rSJ8XTUzmVV73mYt6Beqi0i0bnwbMhtd6hD/IL86/WeEhRl2xT4bETsDfPMKk/uU7wna1gz6APzlMyQicmftRAkMGL0EF422BE7PiNBjYfo7LzLwUCbLLMuiTm4GUCOdoE1kXHjEJkOXxNgi5f4+5jMNBWu57wnas9OZDF4cWmu5iom/mEi17Yd4xqw7PZnKXMjicc7gGQr0D7qyutGRhsA4KvaZMRNHiLeQIgrWmUijEgwszyyLF2hMpaqHVXrM1Q/SLDqXxP5WVKOWUD1L34dt0c7DXkD4oPSikq0DS8BAIHHwtQhQhSIszzyKnYEanYEX0zjt/UJUypv0NxC23awRPnjMjUl3clwS9/8SVUpD3olNksMhuellJbv76WA/ZY9sjGT6bvHUX5BhDWACgGJ5dFmIPOoyTpViGYmmY8n2Q+iharb6Svc4YgkJrKKBzkmeCNt9sGgE0hGVz9ugr9wVcbqSQdVPIzt/9h52xbmjmlaI94xueXKlBEUYzA+H6xgyYGaW7qz5YzBS36SZx2w+kQm1oeIP7ifhQrPjGWGUGYpFx5Ml34yqc0TSimC/ghWBE/G85jWrUiT05nIeHPVvQUti0CxjPU/P5ptGLieSy5j4ITAHt38kMQDqYraXqi1TfjhsT15FKjSGnmL0i40Ub1UkRTm6rmv0kcFgXqlrbVdKoLsOYG6DsxpyuhwohUZbKkWAJu8qYWhHuyGs0bxGZcYAYBWTdatMtx41GV5P7ldHNRTX1vZJwXAmWumyWyFeB+PV3TvcnECddlI3Mb+5BRKAupWWzanMjeDGNwnFPuG6jO1kQpYaS8JiXd0boShrTrUfQcLBcwRIyNfmV2/+rUgeY638ylEr8Iwbk4trRf0aKQLdh35jhW0LLqhRIEf2lea5mb0skqCe5/eNYql0p3WpgBbQD7S6DIG6JIRVNJDEdHdJir7RZ3Kuo8rVtB8CRhWpb9JlH17oOOD6y+5BsViZN4IiDdtUOIWFl+ejJZ/IxMGISWcShZityrbXlQopWI6Efs2ZbFWFpBzGLn1Fv8rMZ7vuymc7k3HH0TMPMRHrNiIObv8NYGBetibke4UYO3sQUXC2+1NsZLjm3L1KAK4rl7ri6vqs/O6WSB7p6zLNWHNixJwN5C/XI0UQeZKVrjuRDKmIQuuGGAhgziVA2hEy64WY3pWReZ0IYZFLDQtKMhZS3Ub5BB965Mr+hmFfl4GsawzHWVSa2hlpdf18itvQmAODFuwkdSN9yo7F9rFpZAORvKecGpJHFGNsnte2E9rna8C1AL55xok5euANWfpB9dn9w00HklD5Gw2kGrYsOi90hwDSF+KDS80cWfTZMGaWHGzaAbh7A3wT0R6L42LRRah48Hua34X1P2TEoN+niNyVkAL/Cr9vQEtrqe/xbWUoZNkqRUCa8EJFmJS5oDiq/rEu+xD4F8BMgJqI7WqNKkLz3IwytxNsFkw6lVJiEaP+Z7BB6081BiYLq4iMfu0hrRoK+b5BOxQx34DZ6rrg9pWmWLt2eT/RYgtiriqL/HyIsZXVl+3U2VXRKkF4FwQwwDePhnWQEaaPC/FGZld3FcqiO8KC62c/jxAbHUf4EoZ0FFmXqlTFrx7loEBwaN1UvGeSM1joitzMgS5m0pnDTxa61PAYFkMZasmdQCwvn4R5La2s3akAjmd0xseAvgSe/5Pr6bwOzHl3h2KpgljpfHZ6A/zH6GfxyCe4hHPJlWvCGKMecxaXlPEG9Tw54fF+aKR6GVbFZ7l/SuAIPuodNCAZK63KuIi8GkvS0N00y3WUSeipRaB5JrQ9Eq2DkExF9UFladYiVhHfSxR8JFvb3kEkH3AofqlL/Ho/Du+/Iu4MQ9HuhxRtiTeeikpjt8s7KoC+TZGTQAJKYLTVO5hJpVZ/2eNsHBpxirnVPlsg1YDBXY3xdWfEMqo20Rgh1hhx44tiWkCjv5dmMmPQjwaAAcTRoT6HkFesoSGslTBfwBM0Ta0bdLkSXF+usGy+FTgCqDUWa2OWw9E4Fd9taEQindkX4afEmC5pcG1tuJc03AMWpF/iN4AXFPLgZHrgHEIn4OFBnTGF6vg5rvfVY4uPymLVaKSLTFMgpsu3cj3Tb6j62EfQSUKWGsqwrItI6Me5aYPKPOtSvGpZyE/r/5g1vPEbqJe+h7M++3wPtlezviivyw4UjIECDBgwsP/XVLpgFd6yUYVaYaTwfSLWNqPSzyXhUzFQtV6loPqtEP3CCqzJr0EOWldYo6Zphze8xmLadzSEsCRxx+or2hZ+WyM/qTkbo30Fg/ISm/lcYfaZ74BrOTUH/WbNW9RGzFcA7wylYaAeBEbwD0x6FRIdZvg3CdMpbPEPfVxU4jnom2pOorZgsDPxlwBfYeHypOani7DZaZj+BcRx1PhC3GaZSWcSLnMyugaL48nUwM1EvIQtOSVstieCYrHyinAw6ejPqKn2NwBJoScYrAMDa77b0HEvA2ftUJERDXV3GQc6FE+XUg6ocWCnJXMGCR2Pek/odBuzjARz144gLkMZRv+wSmtoh1m12GBcHubygtjV6+ASw5LXezoalRr0nIOHTuicMoew9qaqn9IBZT2M4JclzseE0x+xMHbl6dBhtvjqailCJRnsJf8UAyooKbmg7Vn5no57kc04zJIY1vYQ3ckXxcdsf7sQ3xGDTL8t0bJUZxJ6aEkjQ2A9i6UTRjlKaRTsK3C/XIpssAoWFKclHyxlELbr3kPCKrnUMERhVgaD6gEZxmtri64moRuw5FVlvh/XgWjfDaeaxXEsYa4idh/JZTt+WmJQAxoDmGXF7WbY1Qb9ou18MPR3o59GjK/qJJv2W5tG2TwMJgrqAvYZicneOvBbUgv3SLYOPkJ6rZZLx1RvYVLpV31iDpQb8zNqL5m4OjsD1fNVPPTMAQbGfSz8nWDHdSX2IyToKCHvVIjFdCsW1S+FlKzZs3dNJNPtN6OznCau9cGoepfQa6zYsKsn/ModUYTjPpKehENHgGJLknYs5p2c047EQv/p46DcGoWWLk3Q0cCw6HRleIprkzwA25tt8BJvSmyYGfz8nrRDg4ANGjoAAAuxSURBVA6/xIh7CQzi6L6XO0IvPkEe5NWB+Gx1l+C+0b+M80K4KbXocBHrz0QclCD6XLKOhASBiQA1pM3/NbXq9rTo1qCf+Bk37oZuTyqC2E4Mtg0gYvrFrE0ok0VID5H50u0GYct3e2ccXOHvMnN5ixWDWek6TEQx1yJV4qKsxfFEa+Z4MIjHSfgy9CvvS1TgENrLZyrq1rqxhrdAKnDjjbcr/fM90++IFRy9hUrrAp0k7QYcDw82pVJ7zmxODWLHSSx/J6e0Q+gvoWZb4r6dKn92Mt12PupzDlnWCZvbTyuzqvRZld5J8LEDRkA+x5uBjvmrZKpnBJ3neWKKM7sHV+shAqUyO6yfUc8ohwlFXhTj4zS4/CQJPVjyzyDXOjrZumiXRLr9DHDUx9Fw1+Z6Oq9FvAA8o6Kha3kn43wx/cvJVPutLam2RTPmtM1rTi9akki1f92JN6xCK86RuPUffeO4dRh72dgnF1XeeeW65J7dklq4RyLV9hEekaeJpRd5v1t1AIpQiDdkYL8JoEakUqHFzenMScTuRWzR+4IdQSUkzCB6PgGkoHl47+80t7a/MTG3bTeUdS069LPI7NtN8f6jxmIQWmjpL+qDIvx+za1DR6juIZnOfCiZyjxlkavboAnFVxChOwsu7d6fXaqDSjRs86FGity0ZOCKMjtv+1rGOGfg1yXX04hJTHxRP83knuz3FRHrcUv4q7nuzm8DXwBUPN8h6iciugjvXkimBoeZCW3Kx+Z7OsoMgvBjl1RCzcGp5tCm1KLDWuZlDnKnNT5GFv09n51xhi7pvH4hdKMiIa9jmlvbTlD6JtAvNlLhOWHK+riKo5MBwlTZ6eWNieSqZKr9NC/N3Pb3JFOZ35PwURhf++dXL93sMylaRhRMOpPQ7S68zNEkpOKUVy6o3YF18LFQih2it/N4gSGPllTVjU1MD9rRe/LlHJSATQ19H0Q5nwHouvEiDKQ/g5B72bHYfrmervJx6HIiOPRIb1O8b28h1i9WnwaX/xgUTy/EbV6FGeR7TNLoMO+bz3Z+eFMDC9lFmly263oM2kOYSE8LHuCSpZfZnoURcFa+u+uYQN5sF+viidrA7/IPUM0uSTQYjMcXXD4iV3WCUAv3y4H7ScD+yP85tvi3xFjjOLKLXltXvWQAXoXxth4rz3T8kMhegrz2dgoFzJz0IyTA9jS5sF8glgtHHNmhr6fz5OCxZ8RtttHtabRBWYoAc/9GrmeaMqPIvPLZ5S8J8QVC1BGLxX8biViOeHakKd5/FurtDTj0y0uJXQwq2RnvsX8uW3ldoQ7oRoqfI8TXIwt95xEivt2Oxd6Uz3b8kqp+mAD/hD5zANpJv2ZuVmbqunQ1muDsfHfn+ZqfnyTX06mM5nQhygnzt0Hfv1vEZ6KvnFKNq2kgoT2teWNs/Rp+bOHLrUjzop7BQft8IZ/tPGis8YU04zLWuFKNnUjwMj/P93QuRKVZoS/buagv24XONvaBGhma9jLwZwO8dCDUe3sj9uSrq6Cdvy/beSNgx1L6WWjE0/wZuhrf9xfTdXwfad4CsAFe2aV8PrG+u6MTuGhHPMdvBIP617ls54HI3y9j/77uLj0KXdZSVzNJFPqTGU7jYHOq7Swn3oB6uC+B0R46xmD0ykEZ+wO894Ctn7afN7C2a3U91e8fbjoQnbC89Sjk3pfPvvBiPttxKfLaFeDnq++xZ7676+p6895U+Q1u7I/IvxHglZHr6cI27dh9RvPsy3Z8H+21aFNtrbgK2uao91dRTgtAy2rp6+6MpJGeoUEZZwNX3xm7Px1j9ivtM2CaBwNf81bYX9sfZaNJ8Rw1Duh6G+ru91k7hz4Sgeul0rwxtg5B3loXzbsh3935nr6qvuQhT9JjSzCJcVctl3tORalqQo47v20sITtk6aUqZYUUEx0F0bPXFd4LM9d++W69SXvTg4bG/avZehzzFOC4i4lIqIMRUa/W9serb51mq2ISWyeJtnytdLsxkcp8GsubTwZKc0X4cdu2sEzoPLneWZIm8KveemYuXtM+gSwnkNQk3VooYJjEv6El5s7NzEqm2t4BZdMtgGyM3W5IDbrm9XQRqNKLzO4u+Z6OM6LumwDOJJsapWHkp+aTXLDJbiungGESU9BA+n1FS0r/6rDtTmUKwxZh240fRtEfB8wEg6jQF4jQ5VtCAYWyIk311jMxPTqRLwcjCzIR2xwFDJPYMk1mJ1KZt4AhqKTQaxWstS7J/cz8URSnJ/4eJZJT446zoxtzd8IivLy3TsQPTxPSc/w0db8lMaq8rAW7voKtvImd+Z+6+puStiQFDJOYROrq+YpEOnMNmMNaSAe6DamSAhSR8gcW+iyJpbsD06GZfkc+23XH2rXLV1kj1odQBd1ShEWRH7Fp5JaC5LzuN4JpHRvIf0oVloFyjXMrpIBhEpPQKN6BltbMt/R8BQudiyzBGOgRMIqj8tMHwBS69sn1dF6T71n6N8SVtzzBUPaFWP8VhHmGia/FdtjTnmfKHrVSBLNRWE4Z+beBggyTmFgjcSLV9hGnUFiOgXUSslpDLBdiCTEnn+18J/a876OV4V9jqp4CDEX/JUoZCmHJ0VEg+0bkASeeU2RKuoigFGEUllNE+22lGMMkxt1Si+PJdOarmP1/gCziyhya4n075bu7ru4PuRUZOAGzOG4VvMtZ/GWGyyLnrM+G/09pIOEkOz0p4rPIdAbAN09E/YOaj2DsVxcFDJMYV3srgxi8AdP/eUj+omNZb1TmoCf54N+EQdril7B6X0IRl+XifE+XfvNS9E/Rs/oYtBYrJP8TJf1ovIFXHwUMkxhHmydbB08Bg/gEkv6VLXmbfgMCdz2GS3dSjDIIokcn67v/eirg4+g3GlL1D1OIMwpLEMGYSgoYJlFJj036kqndXw9l46VAxE4EnZAL+dAKcWGGm1sz55LwVYFIZTKT9t1/IN9NOvuGav5jlKBXCf0zn01mZhC2awoYJrGZzStsH4YkO0IXsTk7ER6DEKavIa1v1pJlHbcZTMZPN2G7pWXnJHQoen0dBzIbEPY+/w4EGaehANF2ziQmu4mXxJhoCRHlmNy7iKiOnYjF8eZ05vIqBpGD/7D86sn97h/1qcu48cZjITUcVIX8s/zqmc9XhRmvoYBhEpvTB+bO7WkEW5iDNHXtAKRSe85MtA7eqseskcY3KkG8s6874lJfH2sL2XrlHDGdX5X9ALjdNcG7DqrijfdVTAEjSWxG41tWDGOJCsK8dlM7AE1zFr5hIxV+ixlbz0+USpE/MLv7/LskCO8SYmFdZgT/YQorD/r81B/iKpHEWFs9BQyT2Iwm8u47YH6YSfbQw1BhSXXXIJluu8CyLf2/hb3KONBHNMX7D57qD7fK5ZccBbEvs1B/Yv6Qgri8W66nE1IEZKQSjrEMBYIUmEQmEcx2+3VbQ4O3YDitswrWDXPm7L4D3hRqisXxxNy23ZKp9iv6RxLdJN4ORhxxap50mNvz3Z3n13eOQpNsKXh2RK/N7812Lc13d9ytMJ57O7dU7Uy+WycFDJPYzHbR6/QaKXYkdJb/HLHtjmQq43oXo1r8F4R9Dtnp5bB6pf83PeaQ7XyrXjmGcGMMBbZJChgmMY5m02VHPtt1UT7b2dLgUtOIIzsoFEb/ASuFuMm6H3McNTRJDAUmjwKGSUyQlnpTt14Eq6CivNkhmCBBTfLJosCk5WOYxKSR0mRkKLB9UsAwie2zXc1bGQpMGgUMk5g0UpqMDAW2TwoYJrF9tqt5q6mlwHZdmmES23XzmpczFJg4BQyTmDgNTQ6GAts1BQyT2K6b17ycocDEKWCYxMRpaHKYWgqY0qaYAoZJTDHBTXGGAtsaBQyT2NZazNTXUGCKKWCYxBQT3BRnKLCtUcAwiW2txaa2vqY0QwEyTMJ0AkMBQ4ExKWCYxJjkMZGGAoYChkmYPmAoYCgwJgUMkxiTPFMaaQozFNgqKWCYxFbZLKZShgJbDwX+PwAAAP//MGXIpQAAAAZJREFUAwD0HGzM8cAaugAAAABJRU5ErkJggg==\",\"signatureStyle\":\"font-signature-2\",\"signerName\":\"vnc yop mail\",\"signerEmail\":\"vnc@yopmail.com\",\"signedAt\":\"2026-09-18T06:51:43.221Z\"}'),
(570, 60, 74, 1, 'Company', 'Company', NULL, 1, 519, 539, 160, 40, '{\"value\":\"Bexcode Services\",\"docIndex\":0,\"assigneeId\":74,\"assignee\":\"chavda\",\"assigneeEmail\":\"chavdavimaln@gmail.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"clientId\":1789712310319,\"signerName\":\"vc\",\"signerEmail\":\"chavdavimaln@gmail.com\",\"signedAt\":\"2026-09-18T08:03:33.074Z\"}'),
(571, 60, 74, 1, 'Email', 'Email', NULL, 1, 525, 611, 160, 40, '{\"value\":\"chavdavimaln@gmail.com\",\"docIndex\":0,\"assigneeId\":74,\"assignee\":\"chavda\",\"assigneeEmail\":\"chavdavimaln@gmail.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"clientId\":1789712327063,\"signerName\":\"vc\",\"signerEmail\":\"chavdavimaln@gmail.com\",\"signedAt\":\"2026-09-18T08:03:33.074Z\"}'),
(572, 60, 75, 1, 'Company', 'Company', NULL, 1, 60, 533, 160, 40, '{\"value\":\"Bexcode Services\",\"docIndex\":1,\"assigneeId\":75,\"assignee\":\"vimal yop\",\"assigneeEmail\":\"vnc@yopmail.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"clientId\":1789713300664,\"signerName\":\"vnc yop mail\",\"signerEmail\":\"vnc@yopmail.com\",\"signedAt\":\"2026-09-18T06:51:43.221Z\"}'),
(573, 60, 74, 1, 'Signature', 'Signature', NULL, 1, 494, 533, 200, 70, '{\"value\":\"Signature\",\"docIndex\":1,\"assigneeId\":74,\"assignee\":\"chavda\",\"assigneeEmail\":\"chavdavimaln@gmail.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"clientId\":1789713304696,\"signatureImage\":\"data:image/png;base64,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\",\"signatureStyle\":\"font-signature-1\",\"signerName\":\"vc\",\"signerEmail\":\"chavdavimaln@gmail.com\",\"signedAt\":\"2026-09-18T08:03:33.074Z\"}'),
(574, 60, 75, 1, 'Email', 'Email', NULL, 1, 64, 601, 160, 40, '{\"value\":\"vnc@yopmail.com\",\"docIndex\":1,\"assigneeId\":75,\"assignee\":\"vimal yop\",\"assigneeEmail\":\"vnc@yopmail.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"clientId\":1789713318744,\"signerName\":\"vnc yop mail\",\"signerEmail\":\"vnc@yopmail.com\",\"signedAt\":\"2026-09-18T06:51:43.221Z\"}');
INSERT INTO `document_fields` (`id`, `document_id`, `recipient_id`, `page_number`, `field_type`, `label`, `description`, `is_required`, `pos_x`, `pos_y`, `width`, `height`, `options`) VALUES
(611, 52, 57, 1, 'Signature', 'Signature', NULL, 1, 60, 533, 200, 70, '{\"value\":\"Signature\",\"docIndex\":0,\"assigneeId\":57,\"assignee\":\"yop vimal\",\"assigneeEmail\":\"vnc@yopmail.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"clientId\":1789659049682,\"signatureImage\":\"data:image/png;base64,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\",\"signatureStyle\":\"font-signature-1\",\"signerName\":\"vnc yop mail\",\"signerEmail\":\"vnc@yopmail.com\",\"signedAt\":\"2026-09-18T08:17:42.693Z\"}'),
(612, 52, 58, 1, 'Signature', 'Signature', NULL, 1, 462, 542, 200, 70, '{\"value\":\"Signature\",\"docIndex\":0,\"assigneeId\":58,\"assignee\":\"vimal\",\"assigneeEmail\":\"chavdavimaln@gmail.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"clientId\":1789659056866}'),
(613, 52, 58, 1, 'Sign date', 'Sign date', NULL, 1, 469, 611, 160, 40, '{\"value\":\"Sign date\",\"docIndex\":0,\"assigneeId\":58,\"assignee\":\"vimal\",\"assigneeEmail\":\"chavdavimaln@gmail.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"dateFormat\":\"MMM dd yyyy HH:mm z\",\"clientId\":1789659121906}'),
(614, 52, 57, 1, 'Checkbox', 'Checkbox', NULL, 1, 60, 533, 160, 40, '{\"value\":\"true\",\"docIndex\":1,\"assigneeId\":57,\"assignee\":\"yop vimal\",\"assigneeEmail\":\"vnc@yopmail.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"checked\":true,\"clientId\":1789719280195,\"signerName\":\"vnc yop mail\",\"signerEmail\":\"vnc@yopmail.com\",\"signedAt\":\"2026-09-18T08:17:42.693Z\"}'),
(615, 52, 57, 1, 'Job title', 'Job title', NULL, 1, 120, 532, 160, 40, '{\"value\":\"job title\",\"docIndex\":1,\"assigneeId\":57,\"assignee\":\"yop vimal\",\"assigneeEmail\":\"vnc@yopmail.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"clientId\":1789719283026,\"signerName\":\"vnc yop mail\",\"signerEmail\":\"vnc@yopmail.com\",\"signedAt\":\"2026-09-18T08:17:42.693Z\"}'),
(616, 52, 58, 1, 'Email', 'Email', NULL, 1, 456, 617, 160, 40, '{\"value\":\"Email\",\"docIndex\":1,\"assigneeId\":58,\"assignee\":\"vimal\",\"assigneeEmail\":\"chavdavimaln@gmail.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"clientId\":1789719288890}'),
(617, 52, 58, 1, 'Full name', 'Full name', NULL, 1, 455, 557, 160, 40, '{\"value\":\"vimal\",\"docIndex\":1,\"assigneeId\":58,\"assignee\":\"vimal\",\"assigneeEmail\":\"chavdavimaln@gmail.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"nameFormat\":\"Full Name\",\"clientId\":1789719293690}'),
(618, 67, 88, 1, 'Email', 'Email', NULL, 1, 482, 527, 160, 40, '{\"value\":\"Email\",\"docIndex\":0,\"assigneeId\":88,\"assignee\":\"vnc\",\"assigneeEmail\":\"chavdavimaln@gmail.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"clientId\":1789652964607}'),
(619, 67, 88, 1, 'Full name', 'Full name', NULL, 1, 490, 596, 160, 40, '{\"value\":\"vnc\",\"docIndex\":0,\"assigneeId\":88,\"assignee\":\"vnc\",\"assigneeEmail\":\"chavdavimaln@gmail.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"nameFormat\":\"Full Name\",\"clientId\":1789653166975}'),
(620, 67, 88, 1, 'Split text', 'Split text', NULL, 1, 514, 660, 16, 20, '{\"value\":\"\",\"docIndex\":0,\"assigneeId\":88,\"assignee\":\"vnc\",\"assigneeEmail\":\"chavdavimaln@gmail.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"charCount\":10,\"charSpace\":0,\"clientId\":1789653366719}'),
(621, 67, 87, 1, 'Signature', 'Signature', NULL, 1, 68, 543, 200, 70, '{\"value\":\"Signature\",\"docIndex\":0,\"assigneeId\":87,\"assignee\":\"vnc yop mail\",\"assigneeEmail\":\"vnc@yopmail.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"clientId\":1789654282160}'),
(622, 67, 87, 1, 'Checkbox', 'Checkbox', NULL, 1, 60, 533, 160, 40, '{\"value\":\"true\",\"docIndex\":1,\"assigneeId\":87,\"assignee\":\"vnc yop mail\",\"assigneeEmail\":\"vnc@yopmail.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"clientId\":1789654322704}'),
(623, 67, 88, 1, 'Full name', 'Full name', NULL, 1, 494, 527, 160, 40, '{\"value\":\"cvn\",\"docIndex\":1,\"assigneeId\":88,\"assignee\":\"cvn\",\"assigneeEmail\":\"chavdavimaln@gmail.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"nameFormat\":\"Full Name\",\"clientId\":1789654367400}'),
(624, 67, 88, 1, 'Company', 'Company', NULL, 1, 500, 596, 160, 40, '{\"value\":\"Company\",\"docIndex\":1,\"assigneeId\":88,\"assignee\":\"cvn\",\"assigneeEmail\":\"chavdavimaln@gmail.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"clientId\":1789654371952}'),
(628, 68, 89, 2, 'Signature', 'Signature', NULL, 1, 60, 190, 200, 70, '{\"value\":\"Signature\",\"docIndex\":0,\"assigneeId\":89,\"assignee\":\"Vimal Chavda\",\"assigneeEmail\":\"vimal@bexcodeservices.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"clientId\":1789997065114}'),
(629, 68, 90, 2, 'Signature', 'Signature', NULL, 1, 60, 250, 200, 70, '{\"value\":\"Signature\",\"docIndex\":0,\"assigneeId\":90,\"assignee\":\"vnc\",\"assigneeEmail\":\"vnc@yopmail.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"clientId\":1789997069658}'),
(633, 65, 85, 1, 'Signature', 'Signature', NULL, 1, 60, 533, 200, 70, '{\"value\":\"Signature\",\"docIndex\":0,\"assigneeId\":85,\"assignee\":\"Vimal Chavda\",\"assigneeEmail\":\"vimal@bexcodeservices.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"clientId\":1789997174618}'),
(634, 65, 91, 1, 'Signature', 'Signature', NULL, 1, 60, 587, 200, 70, '{\"value\":\"Signature\",\"docIndex\":0,\"assigneeId\":91,\"assignee\":\"vnc yop\",\"assigneeEmail\":\"vnc@yopmail.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"clientId\":1789997177266}'),
(696, 63, 81, 1, 'Signature', 'Signature', NULL, 1, 60, 533, 200, 70, '{\"value\":\"Signature\",\"docIndex\":0,\"assigneeId\":81,\"assignee\":\"Vimal Chavda\",\"assigneeEmail\":\"vnc@yopmail.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"clientId\":1790001278924}'),
(697, 63, 82, 1, 'Signature', 'Signature', NULL, 1, 60, 587, 200, 70, '{\"value\":\"Signature\",\"docIndex\":0,\"assigneeId\":82,\"assignee\":\"vnch\",\"assigneeEmail\":\"chavdavimaln@gmail.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"clientId\":1790001282459}'),
(783, 101, 154, 1, 'Checkbox', 'Checkbox', NULL, 1, 60, 241, 160, 40, '{\"value\":\"true\",\"docIndex\":0,\"assigneeId\":154,\"assignee\":\"Vimal Chavda\",\"assigneeEmail\":\"vimal@bexcodeservices.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"checked\":true,\"clientId\":1790086477570,\"signerName\":\"Vimal Chavda\",\"signerEmail\":\"vimal@bexcodeservices.com\",\"signedAt\":\"2026-09-22T14:14:48.064Z\"}'),
(784, 101, 154, 1, 'Signature', 'Signature', NULL, 1, 154, 243, 200, 70, '{\"value\":\"Signature\",\"docIndex\":0,\"assigneeId\":154,\"assignee\":\"Vimal Chavda\",\"assigneeEmail\":\"vimal@bexcodeservices.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"clientId\":1790086481793,\"signatureImage\":\"data:image/png;base64,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\",\"signatureStyle\":\"font-signature-3\",\"signerName\":\"Vimal Chavda\",\"signerEmail\":\"vimal@bexcodeservices.com\",\"signedAt\":\"2026-09-22T14:14:48.064Z\"}'),
(785, 85, 137, 1, 'Signature', 'Signature', NULL, 1, 60, 533, 200, 70, '{\"value\":\"Signature\",\"docIndex\":1,\"assigneeId\":137,\"assignee\":\"Vimal bex\",\"assigneeEmail\":\"vimal@bexcodeservices.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"clientId\":1790003536701,\"signatureImage\":\"data:image/png;base64,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\",\"signatureStyle\":\"font-signature-1\",\"signerName\":\"Vimal Chavda\",\"signerEmail\":\"vimal@bexcodeservices.com\",\"signedAt\":\"2026-09-21T15:20:22.740Z\"}');
INSERT INTO `document_fields` (`id`, `document_id`, `recipient_id`, `page_number`, `field_type`, `label`, `description`, `is_required`, `pos_x`, `pos_y`, `width`, `height`, `options`) VALUES
(786, 85, 138, 1, 'Signature', 'Signature', NULL, 1, 60, 587, 200, 70, '{\"value\":\"Signature\",\"docIndex\":1,\"assigneeId\":138,\"assignee\":\"cnv\",\"assigneeEmail\":\"chavdavimaln@gmail.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"clientId\":1790003539429,\"signatureImage\":\"data:image/png;base64,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\",\"signatureStyle\":\"font-signature-1\",\"signerName\":\"cvn\",\"signerEmail\":\"chavdavimaln@gmail.com\",\"signedAt\":\"2026-09-21T15:21:24.849Z\"}'),
(787, 85, 139, 1, 'Signature', 'Signature', NULL, 1, 60, 641, 200, 70, '{\"value\":\"Signature\",\"docIndex\":1,\"assigneeId\":139,\"assignee\":\"yop v\",\"assigneeEmail\":\"vnc@yopmail.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"clientId\":1790003543045,\"signatureImage\":\"data:image/png;base64,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\",\"signatureStyle\":\"font-signature-1\",\"signerName\":\"vnc yop mail\",\"signerEmail\":\"vnc@yopmail.com\",\"signedAt\":\"2026-09-21T15:22:37.410Z\"}'),
(788, 85, 137, 1, 'Full name', 'Full name', NULL, 1, 299, 537, 160, 40, '{\"value\":\"Vimal bex\",\"docIndex\":1,\"assigneeId\":137,\"assignee\":\"Vimal bex\",\"assigneeEmail\":\"vimal@bexcodeservices.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"nameFormat\":\"Full Name\",\"clientId\":1790003549413,\"signerName\":\"Vimal Chavda\",\"signerEmail\":\"vimal@bexcodeservices.com\",\"signedAt\":\"2026-09-21T15:20:22.740Z\"}'),
(789, 85, 138, 1, 'Full name', 'Full name', NULL, 1, 302, 594, 160, 40, '{\"value\":\"cnv\",\"docIndex\":1,\"assigneeId\":138,\"assignee\":\"cnv\",\"assigneeEmail\":\"chavdavimaln@gmail.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"nameFormat\":\"Full Name\",\"clientId\":1790003554445,\"signerName\":\"cvn\",\"signerEmail\":\"chavdavimaln@gmail.com\",\"signedAt\":\"2026-09-21T15:21:24.849Z\"}'),
(790, 85, 139, 1, 'Full name', 'Full name', NULL, 1, 307, 652, 160, 40, '{\"value\":\"yop v\",\"docIndex\":1,\"assigneeId\":139,\"assignee\":\"yop v\",\"assigneeEmail\":\"vnc@yopmail.com\",\"font\":\"Roboto\",\"fontSize\":\"11\",\"isBold\":false,\"isItalic\":false,\"nameFormat\":\"Full Name\",\"clientId\":1790003559501,\"signerName\":\"vnc yop mail\",\"signerEmail\":\"vnc@yopmail.com\",\"signedAt\":\"2026-09-21T15:22:37.410Z\"}');

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
(37, 226, 38, 'Bexcode Services', '2026-09-16 18:44:00'),
(38, 227, 38, 'true', '2026-09-16 18:44:00'),
(49, 223, 37, 'Signed by Vimal Chavda', '2026-09-16 19:07:25'),
(50, 224, 37, 'hghg', '2026-09-16 19:07:25'),
(51, 225, 37, 'Sep 17, 2026', '2026-09-16 19:07:25'),
(52, 228, 37, 'Sep 17, 2026', '2026-09-16 19:07:25'),
(53, 229, 37, 'Signed by Vimal Chavda', '2026-09-16 19:07:25'),
(54, 339, 47, 'Signed by Vimal Chavda', '2026-09-17 13:17:46'),
(55, 342, 47, 'Signed by Vimal Chavda', '2026-09-17 13:17:46'),
(56, 343, 47, 'Vimal Chavda', '2026-09-17 13:17:46'),
(57, 344, 47, 'Sep 17, 2026', '2026-09-17 13:17:47'),
(58, 340, 48, 'Signed by vc', '2026-09-17 13:20:04'),
(59, 341, 48, 'Bexcode Services', '2026-09-17 13:20:04'),
(60, 345, 48, 'Bexcode Services', '2026-09-17 13:20:04'),
(61, 346, 48, 'chavdavimaln@gmail.com', '2026-09-17 13:20:04'),
(62, 347, 48, 'true', '2026-09-17 13:20:04'),
(63, 463, 51, 'Signed by vnc yop mail', '2026-09-17 14:29:42'),
(64, 464, 51, 'true', '2026-09-17 14:29:42'),
(65, 460, 50, 'chavdavimaln@gmail.com', '2026-09-17 14:30:31'),
(66, 461, 50, 'vnc', '2026-09-17 14:30:31'),
(67, 462, 50, 's-12345---', '2026-09-17 14:30:31'),
(68, 465, 50, 'cvn', '2026-09-17 14:30:31'),
(69, 466, 50, 'Bexcode Services', '2026-09-17 14:30:31'),
(82, 569, 75, 'Signed by vnc yop mail', '2026-09-18 06:51:43'),
(83, 572, 75, 'Bexcode Services', '2026-09-18 06:51:43'),
(84, 574, 75, 'vnc@yopmail.com', '2026-09-18 06:51:43'),
(85, 570, 74, 'Bexcode Services', '2026-09-18 08:03:33'),
(86, 571, 74, 'chavdavimaln@gmail.com', '2026-09-18 08:03:33'),
(87, 573, 74, 'Signed by vc', '2026-09-18 08:03:33'),
(100, 611, 57, 'Signed by vnc yop mail', '2026-09-18 08:17:42'),
(101, 614, 57, 'true', '2026-09-18 08:17:42'),
(102, 615, 57, 'job title', '2026-09-18 08:17:43');

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
(30, 34, 'Blank Agreement Document.pdf', '/uploads/sample.pdf', NULL, 'pdf', '2026-09-16 12:54:24', 'MUTUAL BUSINESS AGREEMENT AND CONSENT\n\nThis Document represents a formal, legally binding agreement executed between Bexcode Services and the designated Signer.\n\n1. SCOPE AND PURPOSE\nThe undersigned parties hereby ratify the terms, covenants, and conditions specified within this document and agree to the cryptographic authentication protocols implemented herein.\n\n2. ELECTRONIC SIGNATURE LEGAL VALIDITY\nBoth parties expressly consent to the execution of this document via BexSign electronic signatures and acknowledge that digital signatures possess the same legal force as handwritten signatures.\n\n3. RECORD KEEPING AND AUDIT TRAIL\nA comprehensive digital certificate and time-stamped audit trail will be generated upon completion, verifying signer identity, IP address, and document integrity.\n\n4. ACKNOWLEDGMENT AND EXECUTION\nPlease review the contents of this document carefully before affixing your signature in the designated field below.', '/uploads/completed/34/01-Blank-Agreement-Document.pdf', 0),
(31, 35, 'My first document', '/uploads/sample.pdf', NULL, 'pdf', '2026-09-16 13:19:02', '<p style=\"margin-bottom: 12px;\"><strong>1 MUTUAL BUSINESS AGREEMENT AND CONSENT</strong></p><p style=\"margin-bottom: 12px; line-height: 1.6;\">This Document represents a formal, legally binding agreement executed between Bexcode Services and the designated Signer.</p><p style=\"margin-bottom: 12px;\"><strong>1. SCOPE AND PURPOSE<br>The undersigned parties hereby ratify the terms, covenants, and conditions specified within this document and agree to the cryptographic authentication protocols implemented herein.</strong></p><p style=\"margin-bottom: 12px;\"><strong>2. ELECTRONIC SIGNATURE LEGAL VALIDITY<br>Both parties expressly consent to the execution of this document via BexSign electronic signatures and acknowledge that digital signatures possess the same legal force as handwritten signatures.</strong></p><p style=\"margin-bottom: 12px;\"><strong>3. RECORD KEEPING AND AUDIT TRAIL<br>A comprehensive digital certificate and time-stamped audit trail will be generated upon completion, verifying signer identity, IP address, and document integrity.</strong></p><p style=\"margin-bottom: 12px;\"><strong>4. ACKNOWLEDGMENT AND EXECUTION<br>Please review the contents of this document carefully before affixing your signature in the designated field below.</strong></p>', '/uploads/completed/35/01-Blank-Agreement-Document.pdf', 0),
(32, 35, 'My second document 2', '/uploads/sample.pdf', NULL, 'pdf', '2026-09-16 15:05:51', 'MUTUAL BUSINESS AGREEMENT AND CONSENT\n\nThis Document represents a formal, legally binding agreement executed between Bexcode Services and the designated Signer.\n\n1. SCOPE AND PURPOSE\nThe undersigned parties hereby ratify the terms, covenants, and conditions specified within this document and agree to the cryptographic authentication protocols implemented herein.\n\n2. ELECTRONIC SIGNATURE LEGAL VALIDITY\nBoth parties expressly consent to the execution of this document via BexSign electronic signatures and acknowledge that digital signatures possess the same legal force as handwritten signatures.\n\n3. RECORD KEEPING AND AUDIT TRAIL\nA comprehensive digital certificate and time-stamped audit trail will be generated upon completion, verifying signer identity, IP address, and document integrity.\n\n4. ACKNOWLEDGMENT AND EXECUTION\nPlease review the contents of this document carefully before affixing your signature in the designated field below.', NULL, 1),
(38, 41, 'doc 2', '/uploads/sample.pdf', NULL, 'pdf', '2026-09-16 17:29:52', 'MUTUAL BUSINESS AGREEMENT AND CONSENT\n\nThis Document represents a formal, legally binding agreement executed between Bexcode Services and the designated Signer.\n\n1. SCOPE AND PURPOSE\nThe undersigned parties hereby ratify the terms, covenants, and conditions specified within this document and agree to the cryptographic authentication protocols implemented herein.\n\n2. ELECTRONIC SIGNATURE LEGAL VALIDITY\nBoth parties expressly consent to the execution of this document via BexSign electronic signatures and acknowledge that digital signatures possess the same legal force as handwritten signatures.\n\n3. RECORD KEEPING AND AUDIT TRAIL\nA comprehensive digital certificate and time-stamped audit trail will be generated upon completion, verifying signer identity, IP address, and document integrity.\n\n4. ACKNOWLEDGMENT AND EXECUTION\nPlease review the contents of this document carefully before affixing your signature in the designated field below.', NULL, 0),
(39, 42, 'doc-2', '/uploads/sample.pdf', NULL, 'pdf', '2026-09-16 17:34:34', 'MUTUAL BUSINESS AGREEMENT AND CONSENT\n\nThis Document represents a formal, legally binding agreement executed between Bexcode Services and the designated Signer.\n\n1. SCOPE AND PURPOSE\nThe undersigned parties hereby ratify the terms, covenants, and conditions specified within this document and agree to the cryptographic authentication protocols implemented herein.\n\n2. ELECTRONIC SIGNATURE LEGAL VALIDITY\nBoth parties expressly consent to the execution of this document via BexSign electronic signatures and acknowledge that digital signatures possess the same legal force as handwritten signatures.\n\n3. RECORD KEEPING AND AUDIT TRAIL\nA comprehensive digital certificate and time-stamped audit trail will be generated upon completion, verifying signer identity, IP address, and document integrity.\n\n4. ACKNOWLEDGMENT AND EXECUTION\nPlease review the contents of this document carefully before affixing your signature in the designated field below.', '/uploads/completed/42/01-doc-2.pdf', 0),
(40, 42, 'doc-3', '/uploads/sample.pdf', NULL, 'pdf', '2026-09-16 17:35:17', 'MUTUAL BUSINESS AGREEMENT AND CONSENT\n\nThis Document represents a formal, legally binding agreement executed between Bexcode Services and the designated Signer.\n\n1. SCOPE AND PURPOSE\nThe undersigned parties hereby ratify the terms, covenants, and conditions specified within this document and agree to the cryptographic authentication protocols implemented herein.\n\n2. ELECTRONIC SIGNATURE LEGAL VALIDITY\nBoth parties expressly consent to the execution of this document via BexSign electronic signatures and acknowledge that digital signatures possess the same legal force as handwritten signatures.\n\n3. RECORD KEEPING AND AUDIT TRAIL\nA comprehensive digital certificate and time-stamped audit trail will be generated upon completion, verifying signer identity, IP address, and document integrity.\n\n4. ACKNOWLEDGMENT AND EXECUTION\nPlease review the contents of this document carefully before affixing your signature in the designated field below.', '/uploads/completed/42/02-doc-3.pdf', 1),
(49, 47, 'Document 1.pdf', '/uploads/sample.pdf', NULL, 'pdf', '2026-09-16 19:06:12', 'MUTUAL BUSINESS AGREEMENT AND CONSENT\n\nThis Document represents a formal, legally binding agreement executed between Bexcode Services and the designated Signer.\n\n1. SCOPE AND PURPOSE\nThe undersigned parties hereby ratify the terms, covenants, and conditions specified within this document and agree to the cryptographic authentication protocols implemented herein.\n\n2. ELECTRONIC SIGNATURE LEGAL VALIDITY\nBoth parties expressly consent to the execution of this document via BexSign electronic signatures and acknowledge that digital signatures possess the same legal force as handwritten signatures.\n\n3. RECORD KEEPING AND AUDIT TRAIL\nA comprehensive digital certificate and time-stamped audit trail will be generated upon completion, verifying signer identity, IP address, and document integrity.\n\n4. ACKNOWLEDGMENT AND EXECUTION\nPlease review the contents of this document carefully before affixing your signature in the designated field below.', NULL, 0),
(50, 48, 'sign 1', '/uploads/sample.pdf', NULL, 'pdf', '2026-09-17 12:11:59', 'STANDARD EMPLOYMENT AGREEMENT\n\nThis Employment Agreement (the \"Agreement\") is made and entered into by and between Bexcode Services (the \"Company\") and the undersigned individual (the \"Employee\").\n\n1. APPOINTMENT AND SCOPE OF DUTIES\nThe Company agrees to employ the Employee, and the Employee agrees to faithfully perform all duties, services, and responsibilities associated with their designated role to the highest professional standards.\n\n2. COMPENSATION AND PERFORMANCE EVALUATION\nThe Employee shall be entitled to compensation as specified in their formal offer schedule, payable in accordance with the Company\'s standard payroll cycles, subject to applicable statutory deductions and annual performance evaluations.\n\n3. CONFIDENTIALITY AND PROPRIETARY ASSETS\nThe Employee acknowledges that in the course of employment, they will have access to confidential business information, proprietary source code, internal strategies, and trade secrets. The Employee covenants not to disclose or misappropriate any such materials during or following the term of employment.\n\n4. INTELLECTUAL PROPERTY RIGHTS\nAll inventions, designs, source code, workflows, and documentation created or developed by the Employee in connection with their duties shall be the exclusive property of the Company from inception.\n\n5. GOVERNING LAW AND EXECUTION\nThis Agreement shall be governed by and construed in accordance with the governing laws. The parties hereto have caused this Agreement to be executed by their authorized digital signatures.', '/uploads/completed/48/01-sign-1.pdf', 0),
(51, 48, 'sign 2', '/uploads/sample.pdf', NULL, 'pdf', '2026-09-17 13:07:10', 'MUTUAL BUSINESS AGREEMENT AND CONSENT\n\nThis Document represents a formal, legally binding agreement executed between Bexcode Services and the designated Signer.\n\n1. SCOPE AND PURPOSE\nThe undersigned parties hereby ratify the terms, covenants, and conditions specified within this document and agree to the cryptographic authentication protocols implemented herein.\n\n2. ELECTRONIC SIGNATURE LEGAL VALIDITY\nBoth parties expressly consent to the execution of this document via BexSign electronic signatures and acknowledge that digital signatures possess the same legal force as handwritten signatures.\n\n3. RECORD KEEPING AND AUDIT TRAIL\nA comprehensive digital certificate and time-stamped audit trail will be generated upon completion, verifying signer identity, IP address, and document integrity.\n\n4. ACKNOWLEDGMENT AND EXECUTION\nPlease review the contents of this document carefully before affixing your signature in the designated field below.', '/uploads/completed/48/02-sign-2.pdf', 1),
(52, 49, 'vimal 1', '/uploads/sample.pdf', NULL, 'pdf', '2026-09-17 13:48:21', 'MUTUAL BUSINESS AGREEMENT AND CONSENT\n\nThis Document represents a formal, legally binding agreement executed between Bexcode Services and the designated Signer.\n\n1. SCOPE AND PURPOSE\nThe undersigned parties hereby ratify the terms, covenants, and conditions specified within this document and agree to the cryptographic authentication protocols implemented herein.\n\n2. ELECTRONIC SIGNATURE LEGAL VALIDITY\nBoth parties expressly consent to the execution of this document via BexSign electronic signatures and acknowledge that digital signatures possess the same legal force as handwritten signatures.\n\n3. RECORD KEEPING AND AUDIT TRAIL\nA comprehensive digital certificate and time-stamped audit trail will be generated upon completion, verifying signer identity, IP address, and document integrity.\n\n4. ACKNOWLEDGMENT AND EXECUTION\nPlease review the contents of this document carefully before affixing your signature in the designated field below.', '/uploads/completed/49/01-vimal-1.pdf', 0),
(53, 49, 'vimal 2', '/uploads/sample.pdf', NULL, 'pdf', '2026-09-17 13:48:47', 'MUTUAL BUSINESS AGREEMENT AND CONSENT\n\nThis Document represents a formal, legally binding agreement executed between Bexcode Services and the designated Signer.\n\n1. SCOPE AND PURPOSE\nThe undersigned parties hereby ratify the terms, covenants, and conditions specified within this document and agree to the cryptographic authentication protocols implemented herein.\n\n2. ELECTRONIC SIGNATURE LEGAL VALIDITY\nBoth parties expressly consent to the execution of this document via BexSign electronic signatures and acknowledge that digital signatures possess the same legal force as handwritten signatures.\n\n3. RECORD KEEPING AND AUDIT TRAIL\nA comprehensive digital certificate and time-stamped audit trail will be generated upon completion, verifying signer identity, IP address, and document integrity.\n\n4. ACKNOWLEDGMENT AND EXECUTION\nPlease review the contents of this document carefully before affixing your signature in the designated field below.', '/uploads/completed/49/02-vimal-2.pdf', 1),
(56, 52, 'doc 1 vimal', '/uploads/sample.pdf', NULL, 'pdf', '2026-09-17 15:29:27', 'MUTUAL BUSINESS AGREEMENT AND CONSENT\n\nThis Document represents a formal, legally binding agreement executed between Bexcode Services and the designated Signer.\n\n1. SCOPE AND PURPOSE\nThe undersigned parties hereby ratify the terms, covenants, and conditions specified within this document and agree to the cryptographic authentication protocols implemented herein.\n\n2. ELECTRONIC SIGNATURE LEGAL VALIDITY\nBoth parties expressly consent to the execution of this document via BexSign electronic signatures and acknowledge that digital signatures possess the same legal force as handwritten signatures.\n\n3. RECORD KEEPING AND AUDIT TRAIL\nA comprehensive digital certificate and time-stamped audit trail will be generated upon completion, verifying signer identity, IP address, and document integrity.\n\n4. ACKNOWLEDGMENT AND EXECUTION\nPlease review the contents of this document carefully before affixing your signature in the designated field below.', NULL, 0),
(57, 52, 'doc 2 vimal', '/uploads/sample.pdf', NULL, 'pdf', '2026-09-17 15:30:19', 'MUTUAL BUSINESS AGREEMENT AND CONSENT\n\nThis Document represents a formal, legally binding agreement executed between Bexcode Services and the designated Signer.\n\n1. SCOPE AND PURPOSE\nThe undersigned parties hereby ratify the terms, covenants, and conditions specified within this document and agree to the cryptographic authentication protocols implemented herein.\n\n2. ELECTRONIC SIGNATURE LEGAL VALIDITY\nBoth parties expressly consent to the execution of this document via BexSign electronic signatures and acknowledge that digital signatures possess the same legal force as handwritten signatures.\n\n3. RECORD KEEPING AND AUDIT TRAIL\nA comprehensive digital certificate and time-stamped audit trail will be generated upon completion, verifying signer identity, IP address, and document integrity.\n\n4. ACKNOWLEDGMENT AND EXECUTION\nPlease review the contents of this document carefully before affixing your signature in the designated field below.', NULL, 1),
(66, 60, 'document 1', '/uploads/sample.pdf', NULL, 'pdf', '2026-09-18 06:17:52', 'MUTUAL BUSINESS AGREEMENT AND CONSENT\n\nThis Document represents a formal, legally binding agreement executed between Bexcode Services and the designated Signer.\n\n1. SCOPE AND PURPOSE\nThe undersigned parties hereby ratify the terms, covenants, and conditions specified within this document and agree to the cryptographic authentication protocols implemented herein.\n\n2. ELECTRONIC SIGNATURE LEGAL VALIDITY\nBoth parties expressly consent to the execution of this document via BexSign electronic signatures and acknowledge that digital signatures possess the same legal force as handwritten signatures.\n\n3. RECORD KEEPING AND AUDIT TRAIL\nA comprehensive digital certificate and time-stamped audit trail will be generated upon completion, verifying signer identity, IP address, and document integrity.\n\n4. ACKNOWLEDGMENT AND EXECUTION\nPlease review the contents of this document carefully before affixing your signature in the designated field below.', '/uploads/completed/60/01-document-1.pdf', 0),
(67, 60, 'Document 2.pdf', '/uploads/sample.pdf', NULL, 'pdf', '2026-09-18 06:25:55', 'MUTUAL BUSINESS AGREEMENT AND CONSENT\n\nThis Document represents a formal, legally binding agreement executed between Bexcode Services and the designated Signer.\n\n1. SCOPE AND PURPOSE\nThe undersigned parties hereby ratify the terms, covenants, and conditions specified within this document and agree to the cryptographic authentication protocols implemented herein.\n\n2. ELECTRONIC SIGNATURE LEGAL VALIDITY\nBoth parties expressly consent to the execution of this document via BexSign electronic signatures and acknowledge that digital signatures possess the same legal force as handwritten signatures.\n\n3. RECORD KEEPING AND AUDIT TRAIL\nA comprehensive digital certificate and time-stamped audit trail will be generated upon completion, verifying signer identity, IP address, and document integrity.\n\n4. ACKNOWLEDGMENT AND EXECUTION\nPlease review the contents of this document carefully before affixing your signature in the designated field below.', '/uploads/completed/60/02-Document-2.pdf', 1),
(72, 63, 'my doc 101', '/uploads/sample.pdf', NULL, 'pdf', '2026-09-18 12:14:12', 'MUTUAL BUSINESS AGREEMENT AND CONSENT\n\nThis Document represents a formal, legally binding agreement executed between Bexcode Services and the designated Signer.\n\n1. SCOPE AND PURPOSE\nThe undersigned parties hereby ratify the terms, covenants, and conditions specified within this document and agree to the cryptographic authentication protocols implemented herein.\n\n2. ELECTRONIC SIGNATURE LEGAL VALIDITY\nBoth parties expressly consent to the execution of this document via BexSign electronic signatures and acknowledge that digital signatures possess the same legal force as handwritten signatures.\n\n3. RECORD KEEPING AND AUDIT TRAIL\nA comprehensive digital certificate and time-stamped audit trail will be generated upon completion, verifying signer identity, IP address, and document integrity.\n\n4. ACKNOWLEDGMENT AND EXECUTION\nPlease review the contents of this document carefully before affixing your signature in the designated field below.', NULL, 0),
(74, 65, 'agreement', '/uploads/sample.pdf', NULL, 'pdf', '2026-09-18 13:12:49', 'MUTUAL BUSINESS AGREEMENT AND CONSENT\n\nThis Document represents a formal, legally binding agreement executed between Bexcode Services and the designated Signer.\n\n1. SCOPE AND PURPOSE\nThe undersigned parties hereby ratify the terms, covenants, and conditions specified within this document and agree to the cryptographic authentication protocols implemented herein.\n\n2. ELECTRONIC SIGNATURE LEGAL VALIDITY\nBoth parties expressly consent to the execution of this document via BexSign electronic signatures and acknowledge that digital signatures possess the same legal force as handwritten signatures.\n\n3. RECORD KEEPING AND AUDIT TRAIL\nA comprehensive digital certificate and time-stamped audit trail will be generated upon completion, verifying signer identity, IP address, and document integrity.\n\n4. ACKNOWLEDGMENT AND EXECUTION\nPlease review the contents of this document carefully before affixing your signature in the designated field below.', NULL, 0),
(82, 67, 'vimal 1 (Copy)', '/uploads/sample.pdf', NULL, 'pdf', '2026-09-18 18:31:57', 'MUTUAL BUSINESS AGREEMENT AND CONSENT\n\nThis Document represents a formal, legally binding agreement executed between Bexcode Services and the designated Signer.\n\n1. SCOPE AND PURPOSE\nThe undersigned parties hereby ratify the terms, covenants, and conditions specified within this document and agree to the cryptographic authentication protocols implemented herein.\n\n2. ELECTRONIC SIGNATURE LEGAL VALIDITY\nBoth parties expressly consent to the execution of this document via BexSign electronic signatures and acknowledge that digital signatures possess the same legal force as handwritten signatures.\n\n3. RECORD KEEPING AND AUDIT TRAIL\nA comprehensive digital certificate and time-stamped audit trail will be generated upon completion, verifying signer identity, IP address, and document integrity.\n\n4. ACKNOWLEDGMENT AND EXECUTION\nPlease review the contents of this document carefully before affixing your signature in the designated field below.', NULL, 0),
(83, 67, 'vimal 2 (Copy)', '/uploads/sample.pdf', NULL, 'pdf', '2026-09-18 18:31:58', 'MUTUAL BUSINESS AGREEMENT AND CONSENT\n\nThis Document represents a formal, legally binding agreement executed between Bexcode Services and the designated Signer.\n\n1. SCOPE AND PURPOSE\nThe undersigned parties hereby ratify the terms, covenants, and conditions specified within this document and agree to the cryptographic authentication protocols implemented herein.\n\n2. ELECTRONIC SIGNATURE LEGAL VALIDITY\nBoth parties expressly consent to the execution of this document via BexSign electronic signatures and acknowledge that digital signatures possess the same legal force as handwritten signatures.\n\n3. RECORD KEEPING AND AUDIT TRAIL\nA comprehensive digital certificate and time-stamped audit trail will be generated upon completion, verifying signer identity, IP address, and document integrity.\n\n4. ACKNOWLEDGMENT AND EXECUTION\nPlease review the contents of this document carefully before affixing your signature in the designated field below.', NULL, 1),
(84, 68, 'Employment Agreement.pdf', '/uploads/sample.pdf', NULL, 'pdf', '2026-09-21 12:31:39', 'EMPLOYMENT AGREEMENT\n\nThis Employment Agreement (the \"Agreement\") is made on [Effective Date] (the \"Effective Date\") between [Employer Name], of [Employer Address] (the \"Employer\"), and [Employee Name], of [Employee Address] (the \"Employee\").\n\n1. POSITION AND DUTIES\nThe Employer employs the Employee as [Job Title] in the [Department] department, reporting to [Manager Title]. The Employee will perform the duties of the role and other reasonable duties assigned.\n\n2. START DATE AND PROBATION\nEmployment starts on [Start Date]. The first [3] months are a probationary period, during which either party may end employment with [1] week\'s notice.\n\n3. COMPENSATION AND BENEFITS\nThe Employee will receive a gross salary of [Amount] per [year or month], paid [monthly] in arrears, less applicable deductions. The Employee is eligible for the benefits described in the Employer\'s benefits policy.\n\n4. WORKING HOURS AND LEAVE\nNormal working hours are [Hours] per week, [Days and Times]. The Employee is entitled to [Number] days of paid annual leave per year in addition to public holidays.\n\n5. CONFIDENTIALITY AND INTELLECTUAL PROPERTY\nThe Employee will keep the Employer\'s confidential information secret during and after employment. All work created in the course of employment belongs to the Employer.\n\n6. TERMINATION AND NOTICE\nAfter probation, either party may end employment with [1 month\'s] written notice. The Employer may terminate immediately for gross misconduct.\n\n7. ENTIRE AGREEMENT AND AMENDMENTS\nThis Agreement is the entire agreement between the parties about its subject and replaces all earlier proposals and discussions. It may be changed only in writing signed by both parties. If any provision is found unenforceable, the remaining provisions stay in full effect.\n\n8. GOVERNING LAW AND DISPUTES\nThis Agreement is governed by the laws of [Governing Jurisdiction]. The parties will first try to resolve any dispute in good faith; unresolved disputes will be decided by the courts of [Venue].\n\n9. ELECTRONIC SIGNATURES\nThe parties agree that this Agreement may be signed electronically through BexSign and in counterparts, and that each electronic signature has the same legal effect as a handwritten signature.\n\nSIGNATURES\nBy signing below, the Employer and the Employee agree to the terms of this Agreement.', NULL, 0),
(100, 85, '3 agree 1', '/uploads/sample.pdf', NULL, 'pdf', '2026-09-21 15:11:33', 'MUTUAL BUSINESS AGREEMENT AND CONSENT\n\nThis Document represents a formal, legally binding agreement executed between Bexcode Services and the designated Signer.\n\n1. SCOPE AND PURPOSE\nThe undersigned parties hereby ratify the terms, covenants, and conditions specified within this document and agree to the cryptographic authentication protocols implemented herein.\n\n2. ELECTRONIC SIGNATURE LEGAL VALIDITY\nBoth parties expressly consent to the execution of this document via BexSign electronic signatures and acknowledge that digital signatures possess the same legal force as handwritten signatures.\n\n3. RECORD KEEPING AND AUDIT TRAIL\nA comprehensive digital certificate and time-stamped audit trail will be generated upon completion, verifying signer identity, IP address, and document integrity.\n\n4. ACKNOWLEDGMENT AND EXECUTION\nPlease review the contents of this document carefully before affixing your signature in the designated field below.', '/uploads/completed/85/01-3-agree-1.pdf', 0),
(101, 85, '3 agree 2', '/uploads/sample.pdf', NULL, 'pdf', '2026-09-21 15:12:00', 'MUTUAL BUSINESS AGREEMENT AND CONSENT\n\nThis Document represents a formal, legally binding agreement executed between Bexcode Services and the designated Signer.\n\n1. SCOPE AND PURPOSE\nThe undersigned parties hereby ratify the terms, covenants, and conditions specified within this document and agree to the cryptographic authentication protocols implemented herein.\n\n2. ELECTRONIC SIGNATURE LEGAL VALIDITY\nBoth parties expressly consent to the execution of this document via BexSign electronic signatures and acknowledge that digital signatures possess the same legal force as handwritten signatures.\n\n3. RECORD KEEPING AND AUDIT TRAIL\nA comprehensive digital certificate and time-stamped audit trail will be generated upon completion, verifying signer identity, IP address, and document integrity.\n\n4. ACKNOWLEDGMENT AND EXECUTION\nPlease review the contents of this document carefully before affixing your signature in the designated field below.', '/uploads/completed/85/02-3-agree-2.pdf', 1),
(120, 101, 'my sign doc 1.pdf', '/uploads/sample.pdf', NULL, 'pdf', '2026-09-22 14:14:09', '<div style=\"font-size: medium; font-family: ui-sans-serif, system-ui, sans-serif, &quot;Apple Color Emoji&quot;, &quot;Segoe UI Emoji&quot;, &quot;Segoe UI Symbol&quot;, &quot;Noto Color Emoji&quot;;\"><div style=\"\"><div style=\"\"><p style=\"font-size: 0.75rem; margin-bottom: 0px;\"><span style=\"font-size: 15px; color: rgb(51, 65, 85);\">Type the text now; you can keep editing it in the field editor.</span></p></div></div></div><p><br></p><div style=\"text-align: start; color: rgb(15, 23, 42); font-size: medium; font-family: ui-sans-serif, system-ui, sans-serif, &quot;Apple Color Emoji&quot;, &quot;Segoe UI Emoji&quot;, &quot;Segoe UI Symbol&quot;, &quot;Noto Color Emoji&quot;\"></div>', '/uploads/completed/101/01-my-sign-doc-1.pdf', 0);

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
(21, 26, 'BEX-DOC-2026-0026-D0Z7KLHR-M4X0U23OHEQUFE5P658Q8Q', 'BEX-DOC', 2026, 26, 'D0Z7KLHR-M4X0U23OHEQUFE5P658Q8Q', 'Vimal Chavda', 'vimal@bexcodeservices.com', 'font-signature-2', 'data:image/png;base64,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', 'Completed', '::1', 'SHA256-CERTIFIED-ELECTRONIC-RECORD', NULL, '2026-09-04 14:21:13', '2026-09-04 08:49:33', '2026-09-04 08:51:13'),
(22, 166, 'BEX-DOC-2026-0166-TR823WG3-KU3Z2240SVC9YB4MHM537', 'BEX-DOC', 2026, 166, 'TR823WG3-KU3Z2240SVC9YB4MHM537', 'Vimal Chavda', 'vimal@bexcodeservices.com', 'font-signature-1', NULL, 'Draft', '223.181.69.208', 'SHA256-CERTIFIED-ELECTRONIC-RECORD', NULL, NULL, '2026-09-04 17:42:50', '2026-09-04 17:42:50'),
(31, 34, 'BEX-DOC-2026-0034-OUEP0CO9-46Y6RX8KV1PXD47YGRDVC', 'BEX-DOC', 2026, 34, 'OUEP0CO9-46Y6RX8KV1PXD47YGRDVC', 'vc', 'chavdavimaln@gmail.com', 'font-signature-1', 'vc', 'Completed', '::1', 'SHA256-CERTIFIED-ELECTRONIC-RECORD', NULL, '2026-09-16 18:33:51', '2026-09-16 12:54:24', '2026-09-16 13:03:51'),
(32, 35, 'BEX-DOC-2026-0035-RI6Q2914-E4K0JNKDF381717U9NVSTI', 'BEX-DOC', 2026, 35, 'RI6Q2914-E4K0JNKDF381717U9NVSTI', 'vc', 'chavdavimaln@gmail.com', 'font-signature-1', 'vc', 'Completed', '::1', 'SHA256-CERTIFIED-ELECTRONIC-RECORD', NULL, '2026-09-16 18:56:32', '2026-09-16 13:19:02', '2026-09-16 13:26:32'),
(33, 1, 'BEX-DOC-2026-0001-361682B4-ERZWVA2U19FQKOU0LTHEPYMCRKHTZR2MFDEBT65NAG', 'BEX-DOC', 2026, 1, '361682B4-ERZWVA2U19FQKOU0LTHEPYMCRKHTZR2MFDEBT65NAG', 'Vimal Chavda', 'vimal@bexcodeservices.com', 'font-signature-1', NULL, 'Draft', '223.181.69.208', 'SHA256-CERTIFIED-ELECTRONIC-RECORD', NULL, NULL, '2026-09-16 13:32:58', '2026-09-16 13:32:58'),
(39, 41, 'BEX-DOC-2026-0041-KATW7LGG-YUA0T8L8XRKXY7DG6G7LI', 'BEX-DOC', 2026, 41, 'KATW7LGG-YUA0T8L8XRKXY7DG6G7LI', 'Vimal Chavda', 'vimal@bexcodeservices.com', 'font-signature-1', NULL, 'Draft', '223.181.69.208', 'SHA256-CERTIFIED-ELECTRONIC-RECORD', NULL, NULL, '2026-09-16 17:29:52', '2026-09-16 17:29:52'),
(40, 42, 'BEX-DOC-2026-0042-FKWVS7YO-0C4FNJRX31NXUBSSAVKSDC', 'BEX-DOC', 2026, 42, 'FKWVS7YO-0C4FNJRX31NXUBSSAVKSDC', 'Vimal Chavda', 'vimal@bexcodeservices.com', 'font-signature-1', 'data:image/png;base64,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', 'Completed', '::1', 'SHA256-CERTIFIED-ELECTRONIC-RECORD', NULL, '2026-09-17 00:37:26', '2026-09-16 17:34:34', '2026-09-16 19:07:26'),
(45, 47, 'BEX-DOC-2026-0047-4I73PHWE-GNWHTP5DN09VP130OT31U', 'BEX-DOC', 2026, 47, '4I73PHWE-GNWHTP5DN09VP130OT31U', 'Vimal Chavda', 'chavdavimaln@gmail.com', 'font-signature-1', NULL, 'Draft', '223.181.69.208', 'SHA256-CERTIFIED-ELECTRONIC-RECORD', NULL, NULL, '2026-09-16 19:05:52', '2026-09-16 19:05:52'),
(46, 48, 'BEX-DOC-2026-0048-6WDH99UG-JPQI87BOS2CMS2OY619OYB', 'BEX-DOC', 2026, 48, '6WDH99UG-JPQI87BOS2CMS2OY619OYB', 'vc', 'chavdavimaln@gmail.com', 'font-signature-1', 'vc', 'Completed', '::1', 'SHA256-CERTIFIED-ELECTRONIC-RECORD', NULL, '2026-09-17 18:50:04', '2026-09-17 12:12:00', '2026-09-17 13:20:04'),
(47, 49, 'BEX-DOC-2026-0049-ON3RVK9V-A7V7JWP3XBHT7OT45D8UA', 'BEX-DOC', 2026, 49, 'ON3RVK9V-A7V7JWP3XBHT7OT45D8UA', 'vc', 'chavdavimaln@gmail.com', 'font-signature-1', 'vc', 'Completed', '::1', 'SHA256-CERTIFIED-ELECTRONIC-RECORD', NULL, '2026-09-17 20:00:32', '2026-09-17 13:48:21', '2026-09-17 14:30:32'),
(50, 52, 'BEX-DOC-2026-0052-TSXKX7FH-XS3LQ256CHCMM035I48P9G', 'BEX-DOC', 2026, 52, 'TSXKX7FH-XS3LQ256CHCMM035I48P9G', 'vnc yop mail', 'vnc@yopmail.com', 'font-signature-1', 'data:image/png;base64,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', 'In Progress', '::1', 'SHA256-CERTIFIED-ELECTRONIC-RECORD', NULL, '2026-09-18 13:47:43', '2026-09-17 15:29:27', '2026-09-18 08:17:43'),
(58, 60, 'BEX-DOC-2026-0060-6RE1HCIX-KC5XU1ZTNGLRPUL2BL58DJ', 'BEX-DOC', 2026, 60, '6RE1HCIX-KC5XU1ZTNGLRPUL2BL58DJ', 'vc', 'chavdavimaln@gmail.com', 'font-signature-1', 'data:image/png;base64,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', 'Completed', '::1', 'SHA256-CERTIFIED-ELECTRONIC-RECORD', NULL, '2026-09-18 13:33:33', '2026-09-18 06:17:21', '2026-09-18 08:03:33'),
(61, 63, 'BEX-DOC-2026-0063-8NINLDFN-WPVWH5LSAA9JE5M6QAQRZ', 'BEX-DOC', 2026, 63, '8NINLDFN-WPVWH5LSAA9JE5M6QAQRZ', 'Vimal Chavda', 'vimal@bexcodeservices.com', 'font-signature-1', NULL, 'Draft', '223.181.69.208', 'SHA256-CERTIFIED-ELECTRONIC-RECORD', NULL, NULL, '2026-09-18 12:08:36', '2026-09-18 12:08:36'),
(63, 65, 'BEX-DOC-2026-0065-2U1CZA1X-L1XC6QQZVXTL2UZ2AMROWH', 'BEX-DOC', 2026, 65, '2U1CZA1X-L1XC6QQZVXTL2UZ2AMROWH', 'Vimal Chavda', 'vimal@bexcodeservices.com', 'font-signature-1', NULL, 'Draft', '223.181.69.208', 'SHA256-CERTIFIED-ELECTRONIC-RECORD', NULL, NULL, '2026-09-18 13:12:49', '2026-09-18 13:12:49'),
(65, 67, 'BEX-DOC-2026-0067-OFLM89SX-IF0E6BOK9YGRQ0HT3DS40K', 'BEX-DOC', 2026, 67, 'OFLM89SX-IF0E6BOK9YGRQ0HT3DS40K', 'Vimal Chavda', 'vimal@bexcodeservices.com', 'font-signature-1', NULL, 'Draft', '223.181.69.208', 'SHA256-CERTIFIED-ELECTRONIC-RECORD', NULL, NULL, '2026-09-18 18:31:58', '2026-09-18 18:31:58'),
(66, 68, 'BEX-DOC-2026-0068-P71GYF8F-B9XJW66E9PPJSSRK222I', 'BEX-DOC', 2026, 68, 'P71GYF8F-B9XJW66E9PPJSSRK222I', 'Vimal Chavda', 'vimal@bexcodeservices.com', 'font-signature-1', NULL, 'Draft', '223.181.69.208', 'SHA256-CERTIFIED-ELECTRONIC-RECORD', NULL, NULL, '2026-09-21 12:31:40', '2026-09-21 12:31:40'),
(83, 80, 'BEX-DOC-2026-0080-5E9XOODT-A6HISA6U2HARGLELBFATR', 'BEX-DOC', 2026, 80, '5E9XOODT-A6HISA6U2HARGLELBFATR', 'Vimal Chavda', 'vimal@bexcodeservices.com', 'font-signature-1', NULL, 'Draft', '223.181.69.208', 'SHA256-CERTIFIED-ELECTRONIC-RECORD', NULL, NULL, '2026-09-21 15:01:20', '2026-09-21 15:01:20');
INSERT INTO `document_identifiers` (`id`, `document_id`, `bexsign_doc_id`, `prefix`, `year`, `seq_number`, `unique_hash`, `signer_name`, `signer_email`, `signature_style`, `signature_image`, `signature_status`, `audit_ip`, `audit_hash`, `qr_payload`, `signed_at`, `created_at`, `updated_at`) VALUES
(84, 85, 'BEX-DOC-2026-0085-1FGZJE5K-9OAQ0ZO0NZJWALJQJB4UWP', 'BEX-DOC', 2026, 85, '1FGZJE5K-9OAQ0ZO0NZJWALJQJB4UWP', 'vnc yop mail', 'vnc@yopmail.com', 'font-signature-1', 'data:image/png;base64,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', 'Completed', '::1', 'SHA256-CERTIFIED-ELECTRONIC-RECORD', NULL, '2026-09-21 20:52:38', '2026-09-21 15:11:34', '2026-09-21 15:22:38'),
(100, 101, 'BEX-DOC-2026-0101-8GLCPO4X-5GNBKPYXFOTGQ8GSE3IR7C', 'BEX-DOC', 2026, 101, '8GLCPO4X-5GNBKPYXFOTGQ8GSE3IR7C', 'Vimal Chavda', 'vimal@bexcodeservices.com', 'font-signature-3', 'data:image/png;base64,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', 'Completed', '::1', 'SHA256-CERTIFIED-ELECTRONIC-RECORD', NULL, '2026-09-22 19:44:48', '2026-09-22 14:14:09', '2026-09-22 14:14:48');

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
  `signature_image` longtext DEFAULT NULL,
  `declined_at` datetime DEFAULT NULL,
  `decline_reason` text DEFAULT NULL,
  `physical_copy_path` varchar(255) DEFAULT NULL,
  `delegated_from` varchar(255) DEFAULT NULL,
  `delegated_reason` text DEFAULT NULL,
  `consent_at` datetime DEFAULT NULL,
  `consent_ip` varchar(45) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `document_recipients`
--

INSERT INTO `document_recipients` (`id`, `document_id`, `name`, `email`, `role`, `signing_order_index`, `status`, `secure_token`, `otp_code`, `signed_at`, `role_label`, `delivery_mode`, `private_note`, `sent_at`, `viewed_at`, `signed_ip`, `signed_user_agent`, `signature_image`, `declined_at`, `decline_reason`, `physical_copy_path`, `delegated_from`, `delegated_reason`, `consent_at`, `consent_ip`) VALUES
(20, 34, 'Vimal Chavda', 'vimal@bexcodeservices.com', 'signer', 1, 'signed', NULL, NULL, '2026-09-16 18:31:37', 'Needs to sign', 'Email', '', '2026-09-16 18:29:15', '2026-09-16 18:30:09', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'data:image/png;base64,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', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(21, 34, 'vnc', 'chavdavimaln@gmail.com', 'signer', 2, 'signed', NULL, NULL, '2026-09-16 18:33:51', 'Needs to sign', 'Email', '', '2026-09-16 18:31:42', '2026-09-16 18:33:29', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'vc', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(22, 35, 'Vimal Chavda', 'vimal@bexcodeservices.com', 'signer', 1, 'signed', NULL, NULL, '2026-09-16 18:55:59', 'Needs to sign', 'Email', '', '2026-09-16 18:55:30', '2026-09-16 18:55:47', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'data:image/png;base64,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', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(23, 35, 'vnc', 'chavdavimaln@gmail.com', 'signer', 2, 'signed', NULL, NULL, '2026-09-16 18:56:32', 'Needs to sign', 'Email', '', '2026-09-16 18:56:04', '2026-09-16 18:56:22', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'vc', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(36, 41, 'Vimal Chavda', 'vimal@bexcodeservices.com', 'signer', 1, 'pending', NULL, NULL, NULL, 'Needs to sign', 'Email', '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(37, 42, 'Vimal Chavda', 'vimal@bexcodeservices.com', 'signer', 2, 'signed', NULL, NULL, '2026-09-17 00:37:25', 'Needs to sign', 'Email', '', '2026-09-17 00:14:04', '2026-09-17 00:37:11', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'data:image/png;base64,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', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(38, 42, 'vnc', 'chavdavimaln@gmail.com', 'signer', 1, 'signed', NULL, NULL, '2026-09-17 00:14:00', 'Needs to sign', 'Email', '', '2026-09-16 23:12:32', '2026-09-16 23:13:00', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'vc', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(47, 48, 'Vimal Chavda', 'vimal@bexcodeservices.com', 'signer', 1, 'signed', NULL, NULL, '2026-09-17 18:47:47', 'Needs to sign', 'Email', '', '2026-09-17 18:39:37', '2026-09-17 18:39:59', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'data:image/png;base64,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', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(48, 48, 'v n c', 'chavdavimaln@gmail.com', 'signer', 2, 'signed', NULL, NULL, '2026-09-17 18:50:04', 'Needs to sign', 'Email', '', '2026-09-17 18:47:52', '2026-09-17 18:49:43', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'vc', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(50, 49, 'cvn', 'chavdavimaln@gmail.com', 'signer', 2, 'signed', NULL, NULL, '2026-09-17 20:00:31', 'Needs to sign', 'Email', '', '2026-09-17 19:59:46', '2026-09-17 20:00:12', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'vc', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(51, 49, 'vnc yop mail', 'vnc@yopmail.com', 'signer', 1, 'signed', NULL, NULL, '2026-09-17 19:59:42', 'Needs to sign', 'Email', '', '2026-09-17 19:58:03', '2026-09-17 19:58:39', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'vnc yop mail', NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `document_recipients` (`id`, `document_id`, `name`, `email`, `role`, `signing_order_index`, `status`, `secure_token`, `otp_code`, `signed_at`, `role_label`, `delivery_mode`, `private_note`, `sent_at`, `viewed_at`, `signed_ip`, `signed_user_agent`, `signature_image`, `declined_at`, `decline_reason`, `physical_copy_path`, `delegated_from`, `delegated_reason`, `consent_at`, `consent_ip`) VALUES
(57, 52, 'yop vimal', 'vnc@yopmail.com', 'signer', 1, 'signed', NULL, NULL, '2026-09-18 13:47:43', 'Needs to sign', 'Email', '', '2026-09-18 13:45:03', '2026-09-18 13:47:20', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'data:image/png;base64,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', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(58, 52, 'vimal', 'chavdavimaln@gmail.com', 'signer', 2, 'viewed', NULL, NULL, NULL, 'Needs to sign', 'Email', '', '2026-09-18 13:45:07', '2026-09-18 13:45:24', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(74, 60, 'chavda', 'chavdavimaln@gmail.com', 'signer', 2, 'signed', NULL, NULL, '2026-09-18 13:33:33', 'Needs to sign', 'Email', '', '2026-09-18 12:21:47', '2026-09-18 13:33:11', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'data:image/png;base64,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', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(75, 60, 'vimal yop', 'vnc@yopmail.com', 'signer', 1, 'signed', NULL, NULL, '2026-09-18 12:21:43', 'Needs to sign', 'Email', '', '2026-09-18 12:05:30', '2026-09-18 12:07:17', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'data:image/png;base64,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', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(81, 63, 'Vimal Chavda', 'vnc@yopmail.com', 'signer', 1, 'sent', NULL, NULL, NULL, 'Needs to sign', 'Email', '', '2026-09-21 20:04:49', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(82, 63, 'vnch', 'chavdavimaln@gmail.com', 'signer', 2, 'sent', NULL, NULL, NULL, 'Needs to sign', 'Email', '', '2026-09-21 20:04:53', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(85, 65, 'Vimal Chavda', 'vimal@bexcodeservices.com', 'signer', 1, 'sent', NULL, NULL, NULL, 'Needs to sign', 'Email', '', '2026-09-21 18:56:28', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(87, 67, 'Dhruv Patel', 'dhruv@bexcodeservices.com', 'signer', 1, 'viewed', NULL, NULL, NULL, 'Needs to sign', 'Email', '', '2026-09-19 00:02:19', '2026-09-19 00:01:59', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(88, 67, 'Aakash Shah', 'aakash@bexcodeservices.com', 'signer', 2, 'declined', NULL, NULL, NULL, 'Needs to sign', 'Email', '', NULL, NULL, '127.0.0.1', NULL, NULL, '2026-09-19 00:02:00', 'Wrong amount in clause 3', NULL, NULL, NULL, NULL, NULL),
(89, 68, 'Vimal Chavda', 'vimal@bexcodeservices.com', 'signer', 1, 'sent', NULL, NULL, NULL, 'Needs to sign', 'Email', '', '2026-09-21 18:54:38', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(90, 68, 'vnc', 'vnc@yopmail.com', 'signer', 2, 'sent', NULL, NULL, NULL, 'Needs to sign', 'Email', '', '2026-09-21 18:54:42', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(91, 65, 'vnc yop', 'vnc@yopmail.com', 'signer', 2, 'sent', NULL, NULL, NULL, 'Needs to sign', 'Email', '', '2026-09-21 18:56:32', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(137, 85, 'Vimal bex', 'vimal@bexcodeservices.com', 'signer', 1, 'signed', NULL, NULL, '2026-09-21 20:50:22', 'Needs to sign', 'Email', '', '2026-09-21 20:43:02', '2026-09-21 20:50:04', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'data:image/png;base64,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', NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `document_recipients` (`id`, `document_id`, `name`, `email`, `role`, `signing_order_index`, `status`, `secure_token`, `otp_code`, `signed_at`, `role_label`, `delivery_mode`, `private_note`, `sent_at`, `viewed_at`, `signed_ip`, `signed_user_agent`, `signature_image`, `declined_at`, `decline_reason`, `physical_copy_path`, `delegated_from`, `delegated_reason`, `consent_at`, `consent_ip`) VALUES
(138, 85, 'cnv', 'chavdavimaln@gmail.com', 'signer', 2, 'signed', NULL, NULL, '2026-09-21 20:51:25', 'Needs to sign', 'Email', '', '2026-09-21 20:50:27', '2026-09-21 20:50:42', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQkAAABmCAYAAADYvWRfAAAQAElEQVR4Aex9CXxcVfX/Oe/NpOmSmaS2mSlUqSzSTAoiFQTZ+nOXRVARBX4gyOICyiarIH+VnwIKyOYPWf6iPzf8AQriXxAQ3JBFFKFJWq1QFdpMWpuZpE2aZN47/+95M2/yZua9dJqksS13Pve8u527vHPvPffcc++7Y5H5GQoYChgKjEEBwyTGII6JMhQwFCAyTML0AkMBQ4ExKWCYxJjkMZGGAlNLga2xNMMktsZWMXUyFNiKKGCYxFbUGKYqhgJbIwUMk9gaW8XUyVBgK6KAYRJbUWOYqkwtBUxp9VHAMIn66GSwDAVetRQwTOJV2/TmxQ0F6qOAYRL10clgGQq8ailgmMSrtumn9sVNadsuBQyT2HbbztTcUGBKKGCYxJSQ2RRiKLDtUsAwiW237UzNDQWmhAKGSUwJmae2EFOaocBkUsAwicmkpsnLUGA7pIBhEttho5pXMhSYTAoYJjGZ1DR5GQpshxQwTGKCjWqSGwps7xQwTGJ7b2HzfoYCE6SAYRITJKBJbiiwvVPAMIntvYXN+xkKENmJdNthiXTmN8nWzLJkqu3DIAoD6jLbFJOo640MkqGAoUCZAjPnZtLJVOYhFn6AhQ4kpt2J+DtNrQv3ozp/hknUSSiDZiiwrVGgeV7bTrZFj6DebwcETYNF1p7BgLHchkmMRR0TZyiwjVKgpWXnpLh8B9YU7f4rwP1dS6w3wt8N90zYdRnDJOoik0EyFNimKMDutGkfR42DEsSjPLzxTI5b6xDuMPNfYddlIplEXakNkqGAocBWR4HZ6UyGhM8PVCwnTJf09r6Yl+HCAoQ7IxavgF2XMUyiLjIZJEOBbYUCS2KO8Dmo7RyAZ6CwvKKvu/Np9bg2HwD7pekF95+w6zKGSdRFJoNkKLBtUKBlXs/+RHJCoLa/igt9U/2qpyCR9xPzz9es6VyvYfWAYRL1UMngGAr8uylQR/nz58+fLq5cANQGgBoXTOG/fIbgxKaDgVBaHLpHI+sFwyTqpZTBMxTYyinQP9x0oBAfGqjmPfmeGY+rXxmIZblnsMgDfWs6/qZh9YJhEvVSyuAZCkwxBRLp9n2SqUwXQJKptof0YFRUFZQJMNNnEO+P6WHLohuJnh1BGG1wEm8m4sViy7cI6xFA3cbPsO4EBtFQwFBgy1MgMbd9V0vkPpS0EADD74rb9Ak4Qk2IFHFf7+rpTxaRF8ddlz4NKeNX+dXpPxfD6n8aJlE/rQzmq4UCW8F7MsvbhWhesCoiFA/6ffempIiWeYN6BHuJK84NRI8X/HT12oZJ1Espg2coMIUUYObVVcXl2KW7q8I8b3541l5C/C7PU3yUpQhlIEVlJt/f35N+phi9eU/DJDaPXgbbUGBKKJDLNv4cSsabS4UtY3aPyq3p/FPJH7CWxCy2VRcR3NG4zddFrB9ufi8YyAFkOf89HilCCzJMQqlgwFBgq6PAsyO5nq4z89lOBrTlupf9KqyKLaksdBbynnIc08NNDf2/VX/TjgtfI+xeBCbxnfzqZX/UsPGAYRLjoZpJM3kUMDlNiALCfDQyaAaoEXH46y+//PKgeizHPpWJ5pNLN8EvgHGZrYpJNKcXHoLtHm/LJ5HOXIM3wjviaYyhgKFADQVmti5KQZmpF8j4cU/bhcHfq2d2OtNOIuci/ot9azrq/k5D01bDlmYS9uwd95zfkmo/ItGaOb55bmav6gr4fjCFfUWsn8AP8YkI3GEnoiU2/ft+dlProrcmU+0/TKYy6wHYq84orERdzyRaHKpp3tzqzt5h0Wub0+0fTabbv4G98FsVmlvbjorKR/ETqbaPNKcyN3i4qcyNza3t+vlvVJJS+OI4yjg6mco8BXAA+i5Z5PG5VGrPMT8bnj1710Qi3XZoQtswlbkhkW7/diLVfl1Ly87JUuYVlrY58r8LoOUo/KxpzsI3VCBtfx7Wd0y2tl+F914BUPoq6Ps/39yaOU/pOMZr2y3zMgcl0+1HK3h9orXtnap4jEpjs/MfiPPGC2zwBLqpt/fFvKZxRa4UoeXWyMYfaNxEwJpI4rHStqQW7gFCveQUCv90Se5npu+6Nt04Z87uTdXp5s7NzGKhqxHui00EEenhsRQtXoOkMr9HGdoQPclU261NGNTII9Roh062LnpXc+uiD9Cuu04LRSoF+nlb7P6OSMCp+Qlx+b12LPZa+G9DXW9IpgexnbQkVkoyLgsd6oOO464UkTvRwp8k4tOIaQXWoj+lkF8indkX+M8z8Q+E6NNEfIoIP57r6Rhz7zvhHcoZ7EIZ/0tE+wL8dm8l4is2UuG+logBT/itW7eij4UP0DbUcqFQO5FJTncbG3ZFdNAwGNyJaPMHWKy7HMtaBPwHgHCoZVtPJVB/uCfFqNSZSGWWov3dBJhWc/NezZTJ+Mq7SSmj3kxmpdszqMcTeMflxN6x6F2Q9h/Ccoa4stAiOQ7LgoVOvGF5MtX+NsSFGcdxaCevjUT+1+sTzL/YMJJ8RxiyMgJmPikQt8whC2OGqG848UEhfg/a6Eu9YBoBnHE5/c4yrsRjJerNLnuBiVQyIP/HQq8bIGuW7/ftIeID4T4Y4JucxYIB6nsr7eZ5bTuhQbTz6f6vRr4Gj0f7e5Z6ohbcZeM1YDrzc7ehMUfsPiSW7EYrVgyVESodnExnPoS8lyJ4H8AAEx+Zz3a8GyLbg+teef5l13a+yUQYcHTMrHlrdwPOuMzsNMRBlluQuNwGaNjr891dX0WYA6gw2ikskcsQOMpIWS7O93Tci7Aow83pzEkY1E8CYRfCA2YEjOXyuOPsONOePpPEO6BziBtvPBZxkcYi1jyC8TMg+YHJlIM4kc6cIWwd3EixA3I9S+9dv3ppl03yOWDkAM3sfZ04McaKfAjleFIn2kEvVGG834kybeRr8/v6KiRPr+1TmZ8lUxmdzVeMJclqvgDWNInWzLeQZr3am5AYbTCqz9gizyGt3xdHiOXCpnjfwr7urm/0ren6a2+2ayn60OlMfLtOMrpMAH6NYdvtQuAAwDegm/uS7wna/c6sDNruID+Mme7a0LM0q/0K7uuE+OZ8T5feSuWjjNu2xp2yjoTgnq9UoklPfEZsY2UYkWXJoQhjQNEwPTUz3h96vlwHC6QMVcSUBygIcmM+2/UjJBaAZ4oib/u9aMAOENPT/iKywxFbj6V6OFUPHVAfBe4PER4H5Fyx3pnLdtwPN5LiCeMWGmx4GuGcHXeleiZFcF2GXVcgOVD5c16kWhGzWfUwyB6+KtNfey7/Vw0OfwNoofgIZ4i454qQvq/fzmtdcQ/p6+n44tq1y1etWvXsQL6n9Q4ivpuYTmoZQ5qg2t8As9vjBydb2z9gCe2ezzZ+Mpt9foMfPuTQv+DuA8DIQbN3XJeGY9ymKHXyFchglFkSPWoND57nK+x0YCfTbReg7V8AnvYtff9dxGIsExFSa7ilddGeYAxPIE0HBpnO0IMxi77mbyVWJ0lhiQYmcjs67fWI0/4Ci/6JPn8AGP3Vo3XRYA+E2LkD7XH5hp5pevGLFxh8iMvap2eMhvGDvdnUslH/qIvFOgI+HzcHRnm3tp8jpPV5SWLOlxAvgAkbJd6EM6k/A843DvFwED/5uj1ahES/TisH480eCCGyF99XFKUO9zzFxzNVBPG4O0TeF8G1319EKT2Frlyffb7csUuhnqWdHA2IAUNKE5eET4Vk8oQXGXjE7MJ8eLWj9wP/H3BvtmlJtbWjMx1fkVDomnWrloZ+46+MER1X98K1bl4y0OyWNWN87uu9D3tLOA8fD7145LD+nmVV0tbjBRFRqSwj8ekLgBdqgKMdOBi30aGYN+sldBnB8mEe3nhp1KAqJWxx3OFUyT0ua5jpP9Gu7/QTY5CuxuD6RG9JrG4Bo0u2Dn4f7XcVcMr0gpuY5WW1g1CaTO5x2dUlmy8NkBB/b113Z2cQ13crgxiiwi1oE2UmfvCLWF69u6+74xk/oNrGNubKvp7O74bSaMGCRiY+IZBGxKVvE9WekPTGjMhho7jKTGYsd4u3Ue0tTGf2v7JMmfMoygRcFUScQD6hSYUoUxnBK4OzjBc3RC1ErAOPSr8cuLn35VrJX7ZmpfZsJaaLygFE+hHLeT5Big2eeYiJlJv63N1Hf0bi7s99T9DWc/LoQDcizKOHEN8YIcYzu7YqFZWD/zEuEirtIJ+xDAtZ0HNQeSYUog6HY/dSxK+/VopYBonosQh0TxyHyAvR1mN4iuYxvb7SxSMaEASbWWf6JteSHYLhFW6mCgYCGnczD6/xln5C1wrT13pLA5UCvwbLaoW3BTBh44npTGcFM3KFLsBS0NPea/u7DdMeIaajgzgltzfbltxq2c2pzMfCJhO822pySaVVNI2iBmFxfCONQJxXZlUOVwZxuC6vyiElhzKUZKr99mQqIx60ZpZpudX6k5bB6bsiyVsBvinvVPgBZXuosJiIAaQ/UWaSbN34PhK+HHBaVDvTOH/eoBhn2jGTKbdjcSuZhEgNlxV2VZ8Q1JI/0Tt90Gv06gJsKXwADdjuhwvxf/eu7vyt+pNQCKHB7yTiL/NQQws6rRdOpR9m3mt9ZlIK8iydpS3L1UafpwGCAeuS/WW4BVBhdE2LfFRk1Vn5grFmcqpIOepJpnZfgDxOHg2BawwJR+uHGatCioDfW38iZY1pwUzKQlr/ABOKZHoV6W3hUEWsivggRsXtyqBvVxM1DYjLF5PQj6M6JrjTIhTSBFBTlj7Us7kQs+QkpClr85nkgURDn3c3gjL6QqHwIBG/kYjWAKqMzrZF0V2ZSTKVeUiIbkB/WluFSMJ8vc94quMgpZxCqmCm8k/7wrFhDAIYPEQOJjVBGvjUML0Miese6uyskKhRpjK2QJvJ13tDmG4xC34fbFQdT5Jn9YlJ4TbAFyImNw9lvI8txiTcjSNoTA52rAGy3T9UV9QWUtF9uh+OAfQ/tHJljd4iZBZ50WLn65oukW77lIqgUBYdAQXRLyXhMIs0alwJnrKHh0KliNKxVV90g17T+nzYksQbKBZ7IqwwHRc1KErlRVrCtpa1o4+AjtrhcuwXvr/a7htKHiLEmsaPqp4R/XDPLikggxegRuo69J1owYIgnbw8qh9YnGNXh/aoDOdnNjgDui5+rX/zUWW8+pbEmLm8NESv9qQPjdlcmI2tYmj+Tw2ky5HLn9dlaSLdvg9b8jA682P2yPAcOxbbG3hBfRgkToH+5vFCsjiZPIal4p357PSWuEu6NRs8zbjCtvj7SF9jMEm8iZi+EogAD+RTo/pCy7zMgejPegmMn0QZyiXVg18nVKlYPlCkpNi0wxtUj1VuX/SNVXj3m9H/7853z7gOBQlgUg3oOqn5+ZmxTaxr7gY/AC/RSfE49ASjISGuv8cLzm9Cwsm23A8hHIwHTzVCX811z3wl0dp+GQsn8tnOS7XDeFEbHQwqfrO6FdBQoVy5BbMuJBltRPRfxaRfx8X9heeqeqjUp8k7KQAAEABJREFUwEPxY/LTB1LoFKEMpypJjVcZHQudURHBdEsYU1IcHcToAJiJyK8fgkdnRHgqjOYPzApxnCJ0Hc3YCh62aF1ycEafS64qAgcdpu6KDEsey3F10M0uedUCnxTodvg8y6IrlTYaWA3VR4axNHi6f9Vf/lWNV4/fceU44O0K8AwT35Rb0/kcJojDMCH8GP6zctnOz6zDdm1h2FkEpODS6b7emcNPJ7FzReRe5VjW+3zdQMESXUap9IEkRHix68N0QyrRkSVfBFIzoGTkjnxPoyq2S/5RS/Gl8pYoTPR0BfrO06NYRZcMum+h0eWD1uHmDdipoJBfbCS2UMhjbF4sE72PhP5oDQ+dH6rr8LAm9tgiTMITqZl17V6uHRP/Pv+PF3rLASEONPYD//rXX1ZVR2nnrxpczxSEfpJMD36ZLXcQDEJneEfT6YzDTJeruwSRUoTTMO29wEED4QkDZjKmMjCXey4XJuUgaV3Grjr8gkQrYpaldwbAWWuGmJSGh1DgJ+QCv1aZpSg1jJRoWYGsH2tcEJT5gDnqEkb1NgBWiW9dzLZXB/GK7kppwAsT+ou4dKgQP+Ev97zwqodUHhnW2EfwEMBmGW3TKiliBVku1vltx7DwdezS4bnyLhTqa9FHUQAD1AwA96pk37TDSfi0gstHjC4NFscd4fOA5A/8ZY5r6VkSBFWavpGmI4VGpSIh6JEoHqmorZJQNbNnnLiL5bA6g1BT31dYnJ8FMYJu1yLts6PLQqG7rZGNp/ZGLE2Cacfr3iJMwrVJJQh0PvJ/kO4klONiFhsEEmhOww7J90puWL5ZEouxDgwqSxFgJjfFbDmRhJogYn2dCK4iOhcc0UYvzzgo+KYwAibmz5/NxGcXk3nPZY7YkcpAD6PqobMFRNC9EMyAsc2CBdXaawIz+17YrKUZhShpNTiyjjrwUYmPKZIPyD9Ud7FBRHUEr/fxSvaf18X7atbnydeu3UlEdPmnbVREZZpOTHtRpHKPSHUEaJXTafT3CrPzxKi3flfBdY8E9q6AooF0JI4FSZEvh1RwpEoUxQii5LxuSAWia3YviImvJbF2Rn0/XnDlxA1rOsvSUnNq43tBoxM9RH0w3xk2gzc3L2hGPufS6A9jlS+JkgD9D6uAzgA1wmJd2R+y45BM/et16L5LFEkBffsn+ezylequhtJBRN3S9aKY+GeNHDupdxMMIjG/fXbLDhmU4yXb7McWYRL9q+b9jYh/SaO/p63hoRqlpUY7lq1rx14ooX6RbFj/nIYFIblDVo+e6kD0gjHof4MZaj4JH2INb7yQqHg9l0Ym5y3cG/mcpu4SLPNPoZX8ZUsKCXS80SUJEz0c1kHKCUIcOlu4Np9DVMfx8ZUrh9AZvoNsvMHGRKtdh7EdhpAQA6njZOC0IaoA8Aw60KOoI8R8z1vxGLLlEBIq04mIInUXM8hdL0yV27fMv6aVtbogHnFPgIJH9RaoDvm/1xHz7VHKPSAxWXQmXnQelX6oe2TnL6GEWtVSJPLsAPQTy1fwDieNSgWafEmMXFvPn+jukwaswOh8noXOgsR5WpBBeAOZBJIAaqqYRJG6CGmcrn1KD9cVMYnu0U+5fU+1bY1YujQO4j/NIwOPVuOpX9jR5Wda3YCIiRIxMCOWtR8sXUrB8syt2cCZFC8k7FGQ48SligkkDC0qbIswiRruyPRgFLezCo4OgkHXtW72dQqjlV0cpwJfCf80gBphS6C5xp68JZ+qzLOmgxA6UcTabgkU5YTOJLZmChChcEkHcaFm/vz5mE2dk8mhHxCFi//BhMCHJEHY46fiYBO5F4MMzDSIVXTrLIxBdRYTq+5jfTGUBO/zE7gxRvCsNsIfQRADfBO5S7R27fL1kAKCO0g5S9waEXc2lIWuS29jYsfPVG1UYKxDaZRIZfZlEh1Yiq4wZudXhCiIkatnXUalSKLfMbZb0bgXV6/va6+Tl8eUQbhM5+ZWd/09WAaPWCq2lwcy8oyQ6tAHhT8WSDugy5fg5BSIo+b0wgVo4fODYehboTqxpqaFr0H9dGlURGd6LGyiLEbiydYpePpLjb/bhZHizgYCo4wyWbQ1lmVydxTOpsK3CJMQcfRwlM8dB4Td0G8RUDm2LOtE2DuC8P66EF7PcCK94WIQXM/BewF4oO/xwcJ8WnWjl5RkHwSObyLXdk07dmvnCB4OWmXH4sv8hPXYfdh1ULzEtHxQM65BoaD4MrpLkUOnvAWIAqgy6JQsn0NEHp3rBUR6dGGiLtd2aiQtxFNz84JmNGRZ4036E7o/TDLQKACy5rs8Gw+iUGUou46cbjH/AXVZTMHfGFu2LVAGo67/BXR/NoeT7uvvmVmzs6URY4HmRUwn0ehvEM5jIUVcV7vVV7zHEfG61IVF64T4rSJ8XTUzmVV73mYt6Beqi0i0bnwbMhtd6hD/IL86/WeEhRl2xT4bETsDfPMKk/uU7wna1gz6APzlMyQicmftRAkMGL0EF422BE7PiNBjYfo7LzLwUCbLLMuiTm4GUCOdoE1kXHjEJkOXxNgi5f4+5jMNBWu57wnas9OZDF4cWmu5iom/mEi17Yd4xqw7PZnKXMjicc7gGQr0D7qyutGRhsA4KvaZMRNHiLeQIgrWmUijEgwszyyLF2hMpaqHVXrM1Q/SLDqXxP5WVKOWUD1L34dt0c7DXkD4oPSikq0DS8BAIHHwtQhQhSIszzyKnYEanYEX0zjt/UJUypv0NxC23awRPnjMjUl3clwS9/8SVUpD3olNksMhuellJbv76WA/ZY9sjGT6bvHUX5BhDWACgGJ5dFmIPOoyTpViGYmmY8n2Q+iharb6Svc4YgkJrKKBzkmeCNt9sGgE0hGVz9ugr9wVcbqSQdVPIzt/9h52xbmjmlaI94xueXKlBEUYzA+H6xgyYGaW7qz5YzBS36SZx2w+kQm1oeIP7ifhQrPjGWGUGYpFx5Ml34yqc0TSimC/ghWBE/G85jWrUiT05nIeHPVvQUti0CxjPU/P5ptGLieSy5j4ITAHt38kMQDqYraXqi1TfjhsT15FKjSGnmL0i40Ub1UkRTm6rmv0kcFgXqlrbVdKoLsOYG6DsxpyuhwohUZbKkWAJu8qYWhHuyGs0bxGZcYAYBWTdatMtx41GV5P7ldHNRTX1vZJwXAmWumyWyFeB+PV3TvcnECddlI3Mb+5BRKAupWWzanMjeDGNwnFPuG6jO1kQpYaS8JiXd0boShrTrUfQcLBcwRIyNfmV2/+rUgeY638ylEr8Iwbk4trRf0aKQLdh35jhW0LLqhRIEf2lea5mb0skqCe5/eNYql0p3WpgBbQD7S6DIG6JIRVNJDEdHdJir7RZ3Kuo8rVtB8CRhWpb9JlH17oOOD6y+5BsViZN4IiDdtUOIWFl+ejJZ/IxMGISWcShZityrbXlQopWI6Efs2ZbFWFpBzGLn1Fv8rMZ7vuymc7k3HH0TMPMRHrNiIObv8NYGBetibke4UYO3sQUXC2+1NsZLjm3L1KAK4rl7ri6vqs/O6WSB7p6zLNWHNixJwN5C/XI0UQeZKVrjuRDKmIQuuGGAhgziVA2hEy64WY3pWReZ0IYZFLDQtKMhZS3Ub5BB965Mr+hmFfl4GsawzHWVSa2hlpdf18itvQmAODFuwkdSN9yo7F9rFpZAORvKecGpJHFGNsnte2E9rna8C1AL55xok5euANWfpB9dn9w00HklD5Gw2kGrYsOi90hwDSF+KDS80cWfTZMGaWHGzaAbh7A3wT0R6L42LRRah48Hua34X1P2TEoN+niNyVkAL/Cr9vQEtrqe/xbWUoZNkqRUCa8EJFmJS5oDiq/rEu+xD4F8BMgJqI7WqNKkLz3IwytxNsFkw6lVJiEaP+Z7BB6081BiYLq4iMfu0hrRoK+b5BOxQx34DZ6rrg9pWmWLt2eT/RYgtiriqL/HyIsZXVl+3U2VXRKkF4FwQwwDePhnWQEaaPC/FGZld3FcqiO8KC62c/jxAbHUf4EoZ0FFmXqlTFrx7loEBwaN1UvGeSM1joitzMgS5m0pnDTxa61PAYFkMZasmdQCwvn4R5La2s3akAjmd0xseAvgSe/5Pr6bwOzHl3h2KpgljpfHZ6A/zH6GfxyCe4hHPJlWvCGKMecxaXlPEG9Tw54fF+aKR6GVbFZ7l/SuAIPuodNCAZK63KuIi8GkvS0N00y3WUSeipRaB5JrQ9Eq2DkExF9UFladYiVhHfSxR8JFvb3kEkH3AofqlL/Ho/Du+/Iu4MQ9HuhxRtiTeeikpjt8s7KoC+TZGTQAJKYLTVO5hJpVZ/2eNsHBpxirnVPlsg1YDBXY3xdWfEMqo20Rgh1hhx44tiWkCjv5dmMmPQjwaAAcTRoT6HkFesoSGslTBfwBM0Ta0bdLkSXF+usGy+FTgCqDUWa2OWw9E4Fd9taEQindkX4afEmC5pcG1tuJc03AMWpF/iN4AXFPLgZHrgHEIn4OFBnTGF6vg5rvfVY4uPymLVaKSLTFMgpsu3cj3Tb6j62EfQSUKWGsqwrItI6Me5aYPKPOtSvGpZyE/r/5g1vPEbqJe+h7M++3wPtlezviivyw4UjIECDBgwsP/XVLpgFd6yUYVaYaTwfSLWNqPSzyXhUzFQtV6loPqtEP3CCqzJr0EOWldYo6Zphze8xmLadzSEsCRxx+or2hZ+WyM/qTkbo30Fg/ISm/lcYfaZ74BrOTUH/WbNW9RGzFcA7wylYaAeBEbwD0x6FRIdZvg3CdMpbPEPfVxU4jnom2pOorZgsDPxlwBfYeHypOani7DZaZj+BcRx1PhC3GaZSWcSLnMyugaL48nUwM1EvIQtOSVstieCYrHyinAw6ejPqKn2NwBJoScYrAMDa77b0HEvA2ftUJERDXV3GQc6FE+XUg6ocWCnJXMGCR2Pek/odBuzjARz144gLkMZRv+wSmtoh1m12GBcHubygtjV6+ASw5LXezoalRr0nIOHTuicMoew9qaqn9IBZT2M4JclzseE0x+xMHbl6dBhtvjqailCJRnsJf8UAyooKbmg7Vn5no57kc04zJIY1vYQ3ckXxcdsf7sQ3xGDTL8t0bJUZxJ6aEkjQ2A9i6UTRjlKaRTsK3C/XIpssAoWFKclHyxlELbr3kPCKrnUMERhVgaD6gEZxmtri64moRuw5FVlvh/XgWjfDaeaxXEsYa4idh/JZTt+WmJQAxoDmGXF7WbY1Qb9ou18MPR3o59GjK/qJJv2W5tG2TwMJgrqAvYZicneOvBbUgv3SLYOPkJ6rZZLx1RvYVLpV31iDpQb8zNqL5m4OjsD1fNVPPTMAQbGfSz8nWDHdSX2IyToKCHvVIjFdCsW1S+FlKzZs3dNJNPtN6OznCau9cGoepfQa6zYsKsn/ModUYTjPpKehENHgGJLknYs5p2c047EQv/p46DcGoWWLk3Q0cCw6HRleIprkzwA25tt8BJvSmyYGfz8nrRDg4ANGjoAAAuxSURBVA6/xIh7CQzi6L6XO0IvPkEe5NWB+Gx1l+C+0b+M80K4KbXocBHrz0QclCD6XLKOhASBiQA1pM3/NbXq9rTo1qCf+Bk37oZuTyqC2E4Mtg0gYvrFrE0ok0VID5H50u0GYct3e2ccXOHvMnN5ixWDWek6TEQx1yJV4qKsxfFEa+Z4MIjHSfgy9CvvS1TgENrLZyrq1rqxhrdAKnDjjbcr/fM90++IFRy9hUrrAp0k7QYcDw82pVJ7zmxODWLHSSx/J6e0Q+gvoWZb4r6dKn92Mt12PupzDlnWCZvbTyuzqvRZld5J8LEDRkA+x5uBjvmrZKpnBJ3neWKKM7sHV+shAqUyO6yfUc8ohwlFXhTj4zS4/CQJPVjyzyDXOjrZumiXRLr9DHDUx9Fw1+Z6Oq9FvAA8o6Kha3kn43wx/cvJVPutLam2RTPmtM1rTi9akki1f92JN6xCK86RuPUffeO4dRh72dgnF1XeeeW65J7dklq4RyLV9hEekaeJpRd5v1t1AIpQiDdkYL8JoEakUqHFzenMScTuRWzR+4IdQSUkzCB6PgGkoHl47+80t7a/MTG3bTeUdS069LPI7NtN8f6jxmIQWmjpL+qDIvx+za1DR6juIZnOfCiZyjxlkavboAnFVxChOwsu7d6fXaqDSjRs86FGity0ZOCKMjtv+1rGOGfg1yXX04hJTHxRP83knuz3FRHrcUv4q7nuzm8DXwBUPN8h6iciugjvXkimBoeZCW3Kx+Z7OsoMgvBjl1RCzcGp5tCm1KLDWuZlDnKnNT5GFv09n51xhi7pvH4hdKMiIa9jmlvbTlD6JtAvNlLhOWHK+riKo5MBwlTZ6eWNieSqZKr9NC/N3Pb3JFOZ35PwURhf++dXL93sMylaRhRMOpPQ7S68zNEkpOKUVy6o3YF18LFQih2it/N4gSGPllTVjU1MD9rRe/LlHJSATQ19H0Q5nwHouvEiDKQ/g5B72bHYfrmervJx6HIiOPRIb1O8b28h1i9WnwaX/xgUTy/EbV6FGeR7TNLoMO+bz3Z+eFMDC9lFmly263oM2kOYSE8LHuCSpZfZnoURcFa+u+uYQN5sF+viidrA7/IPUM0uSTQYjMcXXD4iV3WCUAv3y4H7ScD+yP85tvi3xFjjOLKLXltXvWQAXoXxth4rz3T8kMhegrz2dgoFzJz0IyTA9jS5sF8glgtHHNmhr6fz5OCxZ8RtttHtabRBWYoAc/9GrmeaMqPIvPLZ5S8J8QVC1BGLxX8biViOeHakKd5/FurtDTj0y0uJXQwq2RnvsX8uW3ldoQ7oRoqfI8TXIwt95xEivt2Oxd6Uz3b8kqp+mAD/hD5zANpJv2ZuVmbqunQ1muDsfHfn+ZqfnyTX06mM5nQhygnzt0Hfv1vEZ6KvnFKNq2kgoT2teWNs/Rp+bOHLrUjzop7BQft8IZ/tPGis8YU04zLWuFKNnUjwMj/P93QuRKVZoS/buagv24XONvaBGhma9jLwZwO8dCDUe3sj9uSrq6Cdvy/beSNgx1L6WWjE0/wZuhrf9xfTdXwfad4CsAFe2aV8PrG+u6MTuGhHPMdvBIP617ls54HI3y9j/77uLj0KXdZSVzNJFPqTGU7jYHOq7Swn3oB6uC+B0R46xmD0ykEZ+wO894Ctn7afN7C2a3U91e8fbjoQnbC89Sjk3pfPvvBiPttxKfLaFeDnq++xZ7676+p6895U+Q1u7I/IvxHglZHr6cI27dh9RvPsy3Z8H+21aFNtrbgK2uao91dRTgtAy2rp6+6MpJGeoUEZZwNX3xm7Px1j9ivtM2CaBwNf81bYX9sfZaNJ8Rw1Duh6G+ru91k7hz4Sgeul0rwxtg5B3loXzbsh3935nr6qvuQhT9JjSzCJcVctl3tORalqQo47v20sITtk6aUqZYUUEx0F0bPXFd4LM9d++W69SXvTg4bG/avZehzzFOC4i4lIqIMRUa/W9serb51mq2ISWyeJtnytdLsxkcp8GsubTwZKc0X4cdu2sEzoPLneWZIm8KveemYuXtM+gSwnkNQk3VooYJjEv6El5s7NzEqm2t4BZdMtgGyM3W5IDbrm9XQRqNKLzO4u+Z6OM6LumwDOJJsapWHkp+aTXLDJbiungGESU9BA+n1FS0r/6rDtTmUKwxZh240fRtEfB8wEg6jQF4jQ5VtCAYWyIk311jMxPTqRLwcjCzIR2xwFDJPYMk1mJ1KZt4AhqKTQaxWstS7J/cz8URSnJ/4eJZJT446zoxtzd8IivLy3TsQPTxPSc/w0db8lMaq8rAW7voKtvImd+Z+6+puStiQFDJOYROrq+YpEOnMNmMNaSAe6DamSAhSR8gcW+iyJpbsD06GZfkc+23XH2rXLV1kj1odQBd1ShEWRH7Fp5JaC5LzuN4JpHRvIf0oVloFyjXMrpIBhEpPQKN6BltbMt/R8BQudiyzBGOgRMIqj8tMHwBS69sn1dF6T71n6N8SVtzzBUPaFWP8VhHmGia/FdtjTnmfKHrVSBLNRWE4Z+beBggyTmFgjcSLV9hGnUFiOgXUSslpDLBdiCTEnn+18J/a876OV4V9jqp4CDEX/JUoZCmHJ0VEg+0bkASeeU2RKuoigFGEUllNE+22lGMMkxt1Si+PJdOarmP1/gCziyhya4n075bu7ru4PuRUZOAGzOG4VvMtZ/GWGyyLnrM+G/09pIOEkOz0p4rPIdAbAN09E/YOaj2DsVxcFDJMYV3srgxi8AdP/eUj+omNZb1TmoCf54N+EQdril7B6X0IRl+XifE+XfvNS9E/Rs/oYtBYrJP8TJf1ovIFXHwUMkxhHmydbB08Bg/gEkv6VLXmbfgMCdz2GS3dSjDIIokcn67v/eirg4+g3GlL1D1OIMwpLEMGYSgoYJlFJj036kqndXw9l46VAxE4EnZAL+dAKcWGGm1sz55LwVYFIZTKT9t1/IN9NOvuGav5jlKBXCf0zn01mZhC2awoYJrGZzStsH4YkO0IXsTk7ER6DEKavIa1v1pJlHbcZTMZPN2G7pWXnJHQoen0dBzIbEPY+/w4EGaehANF2ziQmu4mXxJhoCRHlmNy7iKiOnYjF8eZ05vIqBpGD/7D86sn97h/1qcu48cZjITUcVIX8s/zqmc9XhRmvoYBhEpvTB+bO7WkEW5iDNHXtAKRSe85MtA7eqseskcY3KkG8s6874lJfH2sL2XrlHDGdX5X9ALjdNcG7DqrijfdVTAEjSWxG41tWDGOJCsK8dlM7AE1zFr5hIxV+ixlbz0+USpE/MLv7/LskCO8SYmFdZgT/YQorD/r81B/iKpHEWFs9BQyT2Iwm8u47YH6YSfbQw1BhSXXXIJluu8CyLf2/hb3KONBHNMX7D57qD7fK5ZccBbEvs1B/Yv6Qgri8W66nE1IEZKQSjrEMBYIUmEQmEcx2+3VbQ4O3YDitswrWDXPm7L4D3hRqisXxxNy23ZKp9iv6RxLdJN4ORhxxap50mNvz3Z3n13eOQpNsKXh2RK/N7812Lc13d9ytMJ57O7dU7Uy+WycFDJPYzHbR6/QaKXYkdJb/HLHtjmQq43oXo1r8F4R9Dtnp5bB6pf83PeaQ7XyrXjmGcGMMBbZJChgmMY5m02VHPtt1UT7b2dLgUtOIIzsoFEb/ASuFuMm6H3McNTRJDAUmjwKGSUyQlnpTt14Eq6CivNkhmCBBTfLJosCk5WOYxKSR0mRkKLB9UsAwie2zXc1bGQpMGgUMk5g0UpqMDAW2TwoYJrF9tqt5q6mlwHZdmmES23XzmpczFJg4BQyTmDgNTQ6GAts1BQyT2K6b17ycocDEKWCYxMRpaHKYWgqY0qaYAoZJTDHBTXGGAtsaBQyT2NZazNTXUGCKKWCYxBQT3BRnKLCtUcAwiW2txaa2vqY0QwEyTMJ0AkMBQ4ExKWCYxJjkMZGGAoYChkmYPmAoYCgwJgUMkxiTPFMaaQozFNgqKWCYxFbZLKZShgJbDwX+PwAAAP//MGXIpQAAAAZJREFUAwD0HGzM8cAaugAAAABJRU5ErkJggg==', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(139, 85, 'yop v', 'vnc@yopmail.com', 'signer', 3, 'signed', NULL, NULL, '2026-09-21 20:52:37', 'Needs to sign', 'Email', '', '2026-09-21 20:51:28', '2026-09-21 20:51:40', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'data:image/png;base64,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', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(154, 101, 'Vimal Chavda', 'vimal@bexcodeservices.com', 'signer', 1, 'signed', NULL, NULL, '2026-09-22 19:44:48', 'Needs to sign', 'Email', '', '2026-09-22 19:44:48', '2026-09-22 19:44:48', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'data:image/png;base64,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', NULL, NULL, NULL, NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `document_signing_flow`
--

CREATE TABLE `document_signing_flow` (
  `id` int(11) NOT NULL,
  `document_id` int(11) NOT NULL,
  `mode` varchar(30) NOT NULL DEFAULT 'sequential_shared',
  `signing_order` varchar(20) NOT NULL DEFAULT 'sequential',
  `show_previous_fields` tinyint(1) NOT NULL DEFAULT 1,
  `current_step` int(11) NOT NULL DEFAULT 1,
  `updated_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `document_signing_flow`
--

INSERT INTO `document_signing_flow` (`id`, `document_id`, `mode`, `signing_order`, `show_previous_fields`, `current_step`, `updated_by`, `created_at`, `updated_at`) VALUES
(77, 85, 'sequential_shared', 'sequential', 1, 3, NULL, '2026-09-21 15:11:33', '2026-09-21 15:21:28'),
(96, 101, 'parallel_private', 'parallel', 0, 1, NULL, '2026-09-22 15:28:59', '2026-09-22 15:28:59');

-- --------------------------------------------------------

--
-- Table structure for table `document_validity`
--

CREATE TABLE `document_validity` (
  `id` int(11) NOT NULL,
  `document_id` int(11) DEFAULT NULL,
  `certificate_id` varchar(100) DEFAULT NULL,
  `hash_signature` varchar(255) DEFAULT NULL,
  `is_valid` tinyint(1) DEFAULT 1,
  `checked_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `file_name` varchar(255) DEFAULT NULL,
  `sha256` char(64) DEFAULT NULL,
  `result` varchar(30) NOT NULL DEFAULT 'unknown',
  `message` varchar(500) DEFAULT NULL,
  `source` varchar(30) NOT NULL DEFAULT 'upload',
  `checked_by` int(11) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `document_validity`
--

INSERT INTO `document_validity` (`id`, `document_id`, `certificate_id`, `hash_signature`, `is_valid`, `checked_at`, `file_name`, `sha256`, `result`, `message`, `source`, `checked_by`, `ip_address`) VALUES
(33, 85, 'VRF-20260922-6E852F42', 'beba5615f0c22976be2b082318ef5697d607f7c96f7f58c89e6abe0aaba66260', 1, '2026-09-22 15:40:49', '3 agree 1.pdf', 'beba5615f0c22976be2b082318ef5697d607f7c96f7f58c89e6abe0aaba66260', 'valid', 'Authentic: this PDF is an unchanged copy of a PDF issued by BexSign.', 'auto', 1, '::1'),
(34, 85, 'VRF-20260922-A7B19FA5', '9a920110641a275101a2caaf5a35dc150fd38bcfcc3fbdcdec3e2441c7a9e386', 1, '2026-09-22 15:40:49', '3 agree 2.pdf', '9a920110641a275101a2caaf5a35dc150fd38bcfcc3fbdcdec3e2441c7a9e386', 'valid', 'Authentic: this PDF is an unchanged copy of a PDF issued by BexSign.', 'auto', 1, '::1'),
(35, 85, 'VRF-20260922-389744BA', '315294c3034123c45f00e969118c589ed8bf1bfecafe42fd653dcdd5b165c00e', 1, '2026-09-22 15:40:49', 'Certificate of Completion.pdf', '315294c3034123c45f00e969118c589ed8bf1bfecafe42fd653dcdd5b165c00e', 'valid', 'Authentic: this PDF is an unchanged copy of a PDF issued by BexSign.', 'auto', 1, '::1'),
(36, 101, 'VRF-20260922-6B255FCB', '2e858f17eeb97afe7135d6c7bd6ee3f0ada82f28ba6fcee6b46c026281322fd1', 1, '2026-09-22 17:34:17', 'my sign doc 1.pdf', '2e858f17eeb97afe7135d6c7bd6ee3f0ada82f28ba6fcee6b46c026281322fd1', 'valid', 'Authentic: this PDF is an unchanged copy of a PDF issued by BexSign.', 'auto', 1, '::1'),
(37, 101, 'VRF-20260922-F3082910', '6baa5d498cf36cbc0cf0da02e7f352602a0e35fa88368c71a7c368f9a12387cf', 1, '2026-09-22 17:34:18', 'Certificate of Completion.pdf', '6baa5d498cf36cbc0cf0da02e7f352602a0e35fa88368c71a7c368f9a12387cf', 'valid', 'Authentic: this PDF is an unchanged copy of a PDF issued by BexSign.', 'auto', 1, '::1'),
(38, 85, 'VRF-20260922-55E5FC58', 'beba5615f0c22976be2b082318ef5697d607f7c96f7f58c89e6abe0aaba66260', 1, '2026-09-22 18:00:47', '3 agree 1.pdf', 'beba5615f0c22976be2b082318ef5697d607f7c96f7f58c89e6abe0aaba66260', 'valid', 'Authentic: this PDF is an unchanged copy of a PDF issued by BexSign.', 'auto', 1, '::1'),
(39, 85, 'VRF-20260922-17D75C05', '9a920110641a275101a2caaf5a35dc150fd38bcfcc3fbdcdec3e2441c7a9e386', 1, '2026-09-22 18:00:47', '3 agree 2.pdf', '9a920110641a275101a2caaf5a35dc150fd38bcfcc3fbdcdec3e2441c7a9e386', 'valid', 'Authentic: this PDF is an unchanged copy of a PDF issued by BexSign.', 'auto', 1, '::1'),
(40, 85, 'VRF-20260922-BD586F70', '315294c3034123c45f00e969118c589ed8bf1bfecafe42fd653dcdd5b165c00e', 1, '2026-09-22 18:00:47', 'Certificate of Completion.pdf', '315294c3034123c45f00e969118c589ed8bf1bfecafe42fd653dcdd5b165c00e', 'valid', 'Authentic: this PDF is an unchanged copy of a PDF issued by BexSign.', 'auto', 1, '::1');

-- --------------------------------------------------------

--
-- Table structure for table `document_verification`
--

CREATE TABLE `document_verification` (
  `id` int(11) NOT NULL,
  `document_id` int(11) NOT NULL,
  `required` tinyint(1) NOT NULL DEFAULT 1,
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `integrity_result` varchar(20) DEFAULT NULL,
  `integrity_message` varchar(500) DEFAULT NULL,
  `confirmed_by` int(11) DEFAULT NULL,
  `confirmed_at` datetime DEFAULT NULL,
  `note` varchar(1000) DEFAULT NULL,
  `rejected_reason` varchar(1000) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `document_verification`
--

INSERT INTO `document_verification` (`id`, `document_id`, `required`, `status`, `integrity_result`, `integrity_message`, `confirmed_by`, `confirmed_at`, `note`, `rejected_reason`, `created_at`, `updated_at`) VALUES
(24, 101, 1, 'pending', 'valid', '2 issued documents checked: every fingerprint matches the copy BexSign issued.', NULL, NULL, NULL, NULL, '2026-09-22 15:29:00', '2026-09-22 17:34:18'),
(25, 85, 1, 'confirmed', 'valid', '3 issued documents checked: every fingerprint matches the copy BexSign issued.', 1, '2026-09-22 21:10:49', NULL, NULL, '2026-09-22 15:30:06', '2026-09-22 15:40:49');

-- --------------------------------------------------------

--
-- Table structure for table `document_verification_events`
--

CREATE TABLE `document_verification_events` (
  `id` int(11) NOT NULL,
  `document_id` int(11) NOT NULL,
  `action` varchar(30) NOT NULL,
  `actor_id` int(11) DEFAULT NULL,
  `actor_name` varchar(150) DEFAULT NULL,
  `result` varchar(20) DEFAULT NULL,
  `message` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `document_verification_events`
--

INSERT INTO `document_verification_events` (`id`, `document_id`, `action`, `actor_id`, `actor_name`, `result`, `message`, `created_at`) VALUES
(16, 85, 'confirmed', 1, 'Vimal Chavda', 'valid', '3 issued documents checked: every fingerprint matches the copy BexSign issued.', '2026-09-22 15:40:50'),
(18, 101, 'checked', 1, 'Vimal Chavda', 'valid', '2 issued documents checked: every fingerprint matches the copy BexSign issued.', '2026-09-22 17:34:18'),
(19, 85, 'checked', 1, 'Vimal Chavda', 'valid', '3 issued documents checked: every fingerprint matches the copy BexSign issued.', '2026-09-22 18:00:47');

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
(2, 101, 1, '/uploads/completed/101/01-my-sign-doc-1.pdf', '2026-09-22 14:14:08', '1.0', 'Vimal Chavda', 'Physically signed this document and uploaded a copy', 'Completed');

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
(1, 'EMP001', 'Vimal Chavda', 'vimal@bexcodeservices.com', 'Software Specialist', 'Engineering', 'VC', 'BEX-SIGN-VC-EMP001-2026-361682B4', 'data:image/png;base64,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', 'font-signature-3', 'Active', '2026-09-01 19:43:38', '2026-09-21 16:38:02'),
(2, 'EMP002', 'Manu Yadav', 'manu.yadav@oladigital.health', 'Operations Director', 'Operations', 'MY', 'BEX-SIGN-MY-EMP002-2026-781920A1', NULL, 'font-signature-2', 'Active', '2026-09-01 19:43:38', '2026-09-01 19:43:38'),
(3, 'EMP003', 'Dhruv Patel', 'dhruv@bexcodeservices.com', 'Quality Lead', 'Quality Assurance', 'DP', 'BEX-SIGN-DP-EMP003-2026-928371C3', NULL, 'font-signature-1', 'Active', '2026-09-01 19:43:38', '2026-09-21 18:00:36'),
(7, 'EMP524', 'cvn', 'chavdavimaln@gmail.com', 'Software Specialist', 'Engineering', 'V', 'BEX-SIGN-V-EMP524-2026-4A0319B439CD1CF0', 'data:image/png;base64,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', 'font-signature-2', 'Active', '2026-09-16 10:51:35', '2026-09-21 15:25:15'),
(11, 'EMP228', 'vnc yop mail', 'vnc@yopmail.com', 'Software Specialist', 'Engineering', 'VYM', 'BEX-SIGN-VYM-EMP228-2026-BD7C761738BE2488', 'data:image/png;base64,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', 'font-signature-1', 'Active', '2026-09-17 14:29:43', '2026-09-21 15:22:38');

-- --------------------------------------------------------

--
-- Table structure for table `failed_access_logs`
--

CREATE TABLE `failed_access_logs` (
  `id` int(11) NOT NULL,
  `ip_address` varchar(45) NOT NULL,
  `reason` varchar(255) NOT NULL,
  `attempt_time` timestamp NOT NULL DEFAULT current_timestamp(),
  `email` varchar(255) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `source` varchar(40) NOT NULL DEFAULT 'login',
  `user_agent` varchar(255) DEFAULT NULL,
  `document_id` int(11) DEFAULT NULL,
  `resolved` tinyint(1) NOT NULL DEFAULT 0,
  `resolved_by` int(11) DEFAULT NULL,
  `resolved_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `failed_access_logs`
--

INSERT INTO `failed_access_logs` (`id`, `ip_address`, `reason`, `attempt_time`, `email`, `user_id`, `source`, `user_agent`, `document_id`, `resolved`, `resolved_by`, `resolved_at`) VALUES
(19, 'unknown', 'Signing link opened with an email that is not a recipient', '2026-09-21 19:56:19', 'vnc@yopmail.com', NULL, 'signing_link', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 79, 0, NULL, NULL),
(20, '::1', 'Consent given by an email that is not a recipient', '2026-09-22 16:37:26', 'nobody@example.com', NULL, 'signing_link', 'node', 102, 0, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `general_settings`
--

CREATE TABLE `general_settings` (
  `id` int(11) NOT NULL,
  `organization_name` varchar(150) DEFAULT 'BexSign',
  `organization_email` varchar(255) DEFAULT NULL,
  `logo_url` varchar(500) DEFAULT NULL,
  `brand_color` varchar(20) DEFAULT '#E71414',
  `timezone` varchar(80) DEFAULT 'Asia/Kolkata',
  `date_format` varchar(30) DEFAULT 'MMM dd, yyyy',
  `time_format` varchar(10) DEFAULT '12h',
  `language` varchar(20) DEFAULT 'en',
  `default_expiry_days` int(11) DEFAULT 15,
  `reminder_frequency_days` int(11) DEFAULT 5,
  `auto_reminders` tinyint(1) DEFAULT 1,
  `default_signing_order` varchar(30) DEFAULT 'sequential_shared',
  `allow_decline` tinyint(1) DEFAULT 1,
  `allow_reassign` tinyint(1) DEFAULT 1,
  `allow_print_sign` tinyint(1) DEFAULT 1,
  `require_signer_otp` tinyint(1) DEFAULT 0,
  `session_timeout_minutes` int(11) DEFAULT 60,
  `email_footer` text DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `general_settings`
--

INSERT INTO `general_settings` (`id`, `organization_name`, `organization_email`, `logo_url`, `brand_color`, `timezone`, `date_format`, `time_format`, `language`, `default_expiry_days`, `reminder_frequency_days`, `auto_reminders`, `default_signing_order`, `allow_decline`, `allow_reassign`, `allow_print_sign`, `require_signer_otp`, `session_timeout_minutes`, `email_footer`, `updated_by`, `updated_at`) VALUES
(1, 'BexSign', NULL, NULL, '#E71414', 'Asia/Kolkata', 'MMM dd, yyyy', '12h', 'en', 15, 5, 1, 'sequential_shared', 1, 1, 1, 0, 60, NULL, 1, '2026-09-21 14:19:24');

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
  `layout_version` int(11) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `issued_pdf_fingerprints`
--

INSERT INTO `issued_pdf_fingerprints` (`id`, `sha256`, `document_id`, `file_index`, `kind`, `file_name`, `recipient_email`, `file_path`, `layout_version`, `created_at`) VALUES
(6, 'b4569f3f4084ad355f02ddae025b49ec6ec97f25e21c211acdc5d39d493189b0', 42, 0, 'signed', 'doc-2.pdf', NULL, '/uploads/completed/42/01-doc-2.pdf', 1, '2026-09-16 19:10:40'),
(7, '9f2032b88dddf163b62812a33c63e614b43b7b22626646404a83774430e5eb91', 42, 1, 'signed', 'doc-3.pdf', NULL, '/uploads/completed/42/02-doc-3.pdf', 1, '2026-09-16 19:10:40'),
(8, '785248c49a805d4ad8e394693e419210f188fcd79d395184cecb0ab5342b5eca', 42, NULL, 'certificate', 'Certificate of Completion.pdf', NULL, '/uploads/completed/42/certificate-of-completion.pdf', 1, '2026-09-16 19:10:40'),
(9, 'f77440ed6bb1c985815f07ba4b4e27bf0eff4993174af2bf1f55fd7358b140ac', 48, 0, 'signed', 'sign 1.pdf', NULL, '/uploads/completed/48/01-sign-1.pdf', 1, '2026-09-17 13:20:04'),
(10, '4cb7b60f136a17e3f88ee66f88b76606c5d2b0147379ca44b29cfd4f62e4c105', 48, 1, 'signed', 'sign 2.pdf', NULL, '/uploads/completed/48/02-sign-2.pdf', 1, '2026-09-17 13:20:05'),
(11, '2c96c5694084c7f87608abbf95705149fdf4250bbe2c8a0bf3a930f4f6330c9f', 48, NULL, 'certificate', 'Certificate of Completion.pdf', NULL, '/uploads/completed/48/certificate-of-completion.pdf', 1, '2026-09-17 13:20:05'),
(12, '4323ad35e914c69cdc3adb391930df3a30db00721f45295f227e0caa599c392e', 49, 1, 'signer-copy', 'vimal 2.pdf', 'vnc@yopmail.com', NULL, 1, '2026-09-17 14:29:56'),
(13, '2d47e1d7d17c9bdc051772e6418f61945a99a86f1b214effc4f862e2ad9c9681', 49, 0, 'signed', 'vimal 1.pdf', NULL, '/uploads/completed/49/01-vimal-1.pdf', 1, '2026-09-17 14:30:32'),
(14, '84bd1bed4ef63a8a31122d7d61c59a0691a9667d010064aebf850860472f95b6', 49, 1, 'signed', 'vimal 2.pdf', NULL, '/uploads/completed/49/02-vimal-2.pdf', 1, '2026-09-17 14:30:32'),
(15, 'd077d415def94ded72b064a00976b177f351d1f28cc7e2e20c3727e84329ee7c', 49, NULL, 'certificate', 'Certificate of Completion.pdf', NULL, '/uploads/completed/49/certificate-of-completion.pdf', 1, '2026-09-17 14:30:32'),
(18, '648bdd8fda30d50eaf716be5f664d976981a60bad2076664ce55b2daad1c0364', 34, 0, 'signed', 'Blank Agreement Document.pdf', NULL, '/uploads/completed/34/01-Blank-Agreement-Document.pdf', 2, '2026-09-17 16:02:01'),
(19, '8777c4f1a9ed1d8e4ab8d0a095eead2385e3fc589da3bea1fe5696bbede30ccf', 34, NULL, 'certificate', 'Certificate of Completion.pdf', NULL, '/uploads/completed/34/certificate-of-completion.pdf', 2, '2026-09-17 16:02:02'),
(20, '97151f4794b29287878c723099f1be951f12860241af7dca2f3b2c6abbfdbb03', 42, 0, 'signed', 'doc-2.pdf', NULL, '/uploads/completed/42/01-doc-2.pdf', 2, '2026-09-17 16:02:04'),
(21, 'a56b51c53d444dcd21ef2628806d1ed498c7f6c20e44630f56ddfa2828e9639e', 42, 1, 'signed', 'doc-3.pdf', NULL, '/uploads/completed/42/02-doc-3.pdf', 2, '2026-09-17 16:02:04'),
(22, 'c8a5ee2f44f953c59ae4f6b02c2a36cd9ae5d9c7a3fe6123c1559203ff6c424f', 42, NULL, 'certificate', 'Certificate of Completion.pdf', NULL, '/uploads/completed/42/certificate-of-completion.pdf', 2, '2026-09-17 16:02:06'),
(23, '4b69bf8d3fddcf1bb7d8eb89928d08cdfb07b5720abea82352c44ded217f9c99', 48, 0, 'signed', 'sign 1.pdf', NULL, '/uploads/completed/48/01-sign-1.pdf', 2, '2026-09-17 16:02:07'),
(24, 'cf64b458c88da01c550ccc8d29db85f8849acc0797ba040c62cad764f2db84ae', 48, 1, 'signed', 'sign 2.pdf', NULL, '/uploads/completed/48/02-sign-2.pdf', 2, '2026-09-17 16:02:08'),
(25, '4caccb7bbb75e0a52332564fa4cf6e68c8e5013b841454caa3d3a89ca0abe2f2', 48, NULL, 'certificate', 'Certificate of Completion.pdf', NULL, '/uploads/completed/48/certificate-of-completion.pdf', 2, '2026-09-17 16:02:10'),
(26, 'e76df43b486c1cd8a1ec513745e540cb1b36bbc7bf241c35402883622d8a96f7', 49, 0, 'signed', 'vimal 1.pdf', NULL, '/uploads/completed/49/01-vimal-1.pdf', 2, '2026-09-17 16:02:11'),
(27, '0a71791883cfc4282a40d9f060896451f0dca223f15faad680619689512285bf', 49, 1, 'signed', 'vimal 2.pdf', NULL, '/uploads/completed/49/02-vimal-2.pdf', 2, '2026-09-17 16:02:11'),
(28, '008eafc444bdf9340a08b426eb960cbaa434ded19f2f2c4af630057d24b43a32', 49, NULL, 'certificate', 'Certificate of Completion.pdf', NULL, '/uploads/completed/49/certificate-of-completion.pdf', 2, '2026-09-17 16:02:13'),
(38, '11d13e39b60e73a4ba3cd07b09620371221ffdbdbda88076052932d25757f0a1', 60, 1, 'signer-copy', 'Document 2.pdf', 'vnc@yopmail.com', NULL, 2, '2026-09-18 06:56:31'),
(39, 'acf1f7908cbafe79a5e8fd586c429b69224c05208e550cd1c0efd80ff283050d', 60, 0, 'signed', 'document 1.pdf', NULL, '/uploads/completed/60/01-document-1.pdf', 2, '2026-09-18 08:03:36'),
(40, 'bd0540cc484fcc85aaf1ccc5dde3d93da2832e169a6b8810e91159a2eccd3d51', 60, 1, 'signed', 'Document 2.pdf', NULL, '/uploads/completed/60/02-Document-2.pdf', 2, '2026-09-18 08:03:37'),
(41, '73e12ebfda81d8370cac9e2a3ae4145f93f057259a0b9222e39edbe880aecd11', 60, NULL, 'certificate', 'Certificate of Completion.pdf', NULL, '/uploads/completed/60/certificate-of-completion.pdf', 2, '2026-09-18 08:03:39'),
(42, 'e54f1ec97943dc255bfb6b6959278b6a0372abd68a9cf926cf25c110ac6982e6', 34, 0, 'signed', 'Blank Agreement Document.pdf', NULL, '/uploads/completed/34/01-Blank-Agreement-Document.pdf', 3, '2026-09-18 08:03:48'),
(43, 'f28e50de06da8340a63e22c2588ee9dd9109bfd3fcd9cdef7c293229d9f3e671', 34, NULL, 'certificate', 'Certificate of Completion.pdf', NULL, '/uploads/completed/34/certificate-of-completion.pdf', 3, '2026-09-18 08:03:50'),
(44, '31fab4d56a851bd4bf81cc6b69662ac05db143f807220d43fba9da0a42d3aa7c', 42, 0, 'signed', 'doc-2.pdf', NULL, '/uploads/completed/42/01-doc-2.pdf', 3, '2026-09-18 08:03:52'),
(45, '158f3b963b5826051f7ddc0543a2eabfb9cd124d1df1d71956e42a0103c3c95e', 42, 1, 'signed', 'doc-3.pdf', NULL, '/uploads/completed/42/02-doc-3.pdf', 3, '2026-09-18 08:03:53'),
(46, '81d3021d898cad9853236b965b044d3b7913e56d2db6aa3318a6b8ec24a61b87', 42, NULL, 'certificate', 'Certificate of Completion.pdf', NULL, '/uploads/completed/42/certificate-of-completion.pdf', 3, '2026-09-18 08:03:55'),
(47, '3608d1e6d557b4283d151d2b8a77c9a4d464d2e4cd9ba7ec453b073d806515de', 48, 0, 'signed', 'sign 1.pdf', NULL, '/uploads/completed/48/01-sign-1.pdf', 3, '2026-09-18 08:03:57'),
(48, '3441014de27af54176b5deaba59a2f82004cf13ea8be348f48b519c2bf964ee0', 48, 1, 'signed', 'sign 2.pdf', NULL, '/uploads/completed/48/02-sign-2.pdf', 3, '2026-09-18 08:03:58'),
(49, 'a17366bd84b1b4fc943bcec28264e0f128708bd23a260f21374b7390b3247355', 48, NULL, 'certificate', 'Certificate of Completion.pdf', NULL, '/uploads/completed/48/certificate-of-completion.pdf', 3, '2026-09-18 08:04:00'),
(50, 'e0059e2088e499c7e4a55bab55bad6186b67fd7053f0f413df82a3dcb4cfb24f', 49, 0, 'signed', 'vimal 1.pdf', NULL, '/uploads/completed/49/01-vimal-1.pdf', 3, '2026-09-18 08:04:01'),
(51, '7412401efdf8a9469091b23594a9f4a2f7f84dea83f8d4fe4207f2a50fe8eff6', 49, 1, 'signed', 'vimal 2.pdf', NULL, '/uploads/completed/49/02-vimal-2.pdf', 3, '2026-09-18 08:04:02'),
(52, '6f7fc446d0a16e4ac059c2548c6c52b4477b3a4e97f11e3d3b304c6adc8af257', 49, NULL, 'certificate', 'Certificate of Completion.pdf', NULL, '/uploads/completed/49/certificate-of-completion.pdf', 3, '2026-09-18 08:04:03'),
(53, 'f2eee3bfa60ba49cfc4ee15f365612f072474bf1df2cfdf71994406fc187ac9c', 60, 0, 'signed', 'document 1.pdf', NULL, '/uploads/completed/60/01-document-1.pdf', 3, '2026-09-18 08:04:04'),
(54, '1d54d98a8a9b9a20c953e083ca643da0d469fb18107b399740334e62dd9daef7', 60, 1, 'signed', 'Document 2.pdf', NULL, '/uploads/completed/60/02-Document-2.pdf', 3, '2026-09-18 08:04:05'),
(55, '1c59f335a74bb663566fa1e348f4782223be1439170c479c780719dd4af92bdc', 60, NULL, 'certificate', 'Certificate of Completion.pdf', NULL, '/uploads/completed/60/certificate-of-completion.pdf', 3, '2026-09-18 08:04:06'),
(56, '2cd6b6292d6fad4696746f7c697aaaf99695b3eb1200812bf1d778d5b0eacfd7', 61, 0, 'signed', 'vimal 1 (Copy).pdf', NULL, '/uploads/completed/61/01-vimal-1-Copy.pdf', 3, '2026-09-18 08:04:27'),
(57, 'a17dd1cd07a641c5d5d6af35fa64047e8cb6e0484300d94fbd1d35545b810349', 61, 1, 'signed', 'vimal 2 (Copy).pdf', NULL, '/uploads/completed/61/02-vimal-2-Copy.pdf', 3, '2026-09-18 08:04:28'),
(58, 'fb2a61fb5ebbc40a68df17578f5963dc60df3de1adb38bca12518a1e8dba35ff', 61, NULL, 'certificate', 'Certificate of Completion.pdf', NULL, '/uploads/completed/61/certificate-of-completion.pdf', 3, '2026-09-18 08:04:29'),
(59, 'd08ae5cabc96ac7bc6e86b9c276ccf7b401093fca657c81a76374fe429bab15c', 62, 1, 'signer-copy', 'vimal 2 (Copy 2).pdf', 'chavdavimaln@gmail.com', NULL, 3, '2026-09-18 08:06:47'),
(60, 'fa31ae04de3c8f8cf78f461a36f051c31d33297af94b90337b7d8481f732a8cc', 62, 0, 'signer-copy', 'vimal 1 (Copy 2).pdf', 'chavdavimaln@gmail.com', NULL, 3, '2026-09-18 08:06:58'),
(61, 'f33ad86d1123830bd6bc72556af5aa9101245bac00d6a46af9d4c5255a9c84d3', 62, 1, 'signer-copy', 'vimal 2 (Copy 2).pdf', 'chavdavimaln@gmail.com', NULL, 3, '2026-09-18 08:06:59'),
(62, '03976bad5aad57e4151d39ce8c1baa8a19c85f042cb0d5680aff2625aa5208b6', 62, 0, 'signer-copy', 'vimal 1 (Copy 2).pdf', 'chavdavimaln@gmail.com', NULL, 3, '2026-09-18 08:07:20'),
(63, '7c79668d74d05e3863b6d3927602dc622cbf4c147eccc8b52c21ecbf73acc945', 62, 0, 'protected-copy', 'vimal 1 (Copy 2).pdf', 'chavdavimaln@gmail.com', NULL, 3, '2026-09-18 08:07:21'),
(64, '572585c7199003710d05b6bd0f92639b2e3698df8a3be4ddef3196ffbf332df7', 52, 0, 'signer-copy', 'doc 1 vimal.pdf', 'vnc@yopmail.com', NULL, 3, '2026-09-18 08:17:54'),
(69, 'd3e457289c3ae48c311d90492e44afd569e80aebafe9ef72f1458fe4ec627e92', 85, 1, 'signer-copy', '3 agree 2.pdf', 'chavdavimaln@gmail.com', NULL, 3, '2026-09-21 15:21:50'),
(70, '3eecac49ab427d7af58eae676ef560b87ca05ade718fa0b979d5a8636b9fcdec', 85, 1, 'signer-copy', '3 agree 2.pdf', 'chavdavimaln@gmail.com', NULL, 3, '2026-09-21 15:22:02'),
(71, 'beba5615f0c22976be2b082318ef5697d607f7c96f7f58c89e6abe0aaba66260', 85, 0, 'signed', '3 agree 1.pdf', NULL, '/uploads/completed/85/01-3-agree-1.pdf', 3, '2026-09-21 15:22:40'),
(72, '9a920110641a275101a2caaf5a35dc150fd38bcfcc3fbdcdec3e2441c7a9e386', 85, 1, 'signed', '3 agree 2.pdf', NULL, '/uploads/completed/85/02-3-agree-2.pdf', 3, '2026-09-21 15:22:41'),
(73, '315294c3034123c45f00e969118c589ed8bf1bfecafe42fd653dcdd5b165c00e', 85, NULL, 'certificate', 'Certificate of Completion.pdf', NULL, '/uploads/completed/85/certificate-of-completion.pdf', 3, '2026-09-21 15:22:43'),
(90, '2e858f17eeb97afe7135d6c7bd6ee3f0ada82f28ba6fcee6b46c026281322fd1', 101, 0, 'signed', 'my sign doc 1.pdf', NULL, '/uploads/completed/101/01-my-sign-doc-1.pdf', 3, '2026-09-22 14:14:54'),
(91, '6baa5d498cf36cbc0cf0da02e7f352602a0e35fa88368c71a7c368f9a12387cf', 101, NULL, 'certificate', 'Certificate of Completion.pdf', NULL, '/uploads/completed/101/certificate-of-completion.pdf', 3, '2026-09-22 14:14:55');

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
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `category` varchar(40) NOT NULL DEFAULT 'system',
  `severity` varchar(20) NOT NULL DEFAULT 'info',
  `link` varchar(255) DEFAULT NULL,
  `entity_type` varchar(40) DEFAULT NULL,
  `entity_id` int(11) DEFAULT NULL,
  `actor_name` varchar(150) DEFAULT NULL,
  `read_at` datetime DEFAULT NULL,
  `email_sent` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `is_read`, `type`, `created_at`, `category`, `severity`, `link`, `entity_type`, `entity_id`, `actor_name`, `read_at`, `email_sent`) VALUES
(26, 1, 'Vimal Chavda asked you to sign \"Employment Agreement.pdf\"', 'The document needs your signature. The request expires on Oct 6, 2026.', 0, 'info', '2026-09-21 13:24:38', 'signing', 'info', '/documents/sign/68?email=vimal%40bexcodeservices.com', 'document', 68, 'Vimal Chavda', NULL, 0),
(27, 1, 'Vimal Chavda asked you to sign \"agreement\"', 'The document needs your signature. The request expires on Oct 6, 2026.', 0, 'info', '2026-09-21 13:26:28', 'signing', 'info', '/documents/sign/65?email=vimal%40bexcodeservices.com', 'document', 65, 'Vimal Chavda', NULL, 0),
(46, 1, 'Vimal Chavda asked you to sign \"3 agree 1\"', '2 documents need your signature. The request expires on Oct 6, 2026.', 1, 'info', '2026-09-21 15:13:02', 'signing', 'info', '/documents/sign/85?email=vimal%40bexcodeservices.com', 'document', 85, 'Vimal Chavda', '2026-09-21 22:54:09', 0),
(47, 1, 'cnv viewed \"3 agree 1\"', 'chavdavimaln@gmail.com opened the signing request.', 0, 'info', '2026-09-21 15:20:43', 'document', 'info', '/documents/85', 'document', 85, 'cnv', NULL, 0),
(48, 1, 'cnv viewed \"3 agree 1\"', 'chavdavimaln@gmail.com opened the signing request.', 0, 'info', '2026-09-21 15:20:43', 'document', 'info', '/documents/85', 'document', 85, 'cnv', NULL, 0),
(49, 1, 'cvn signed \"3 agree 1\"', '1 recipient still needs to sign: yop v.', 1, 'success', '2026-09-21 15:21:25', 'document', 'success', '/documents/85', 'document', 85, 'cvn', '2026-09-21 22:54:05', 0),
(50, 1, 'yop v viewed \"3 agree 1\"', 'vnc@yopmail.com opened the signing request.', 1, 'info', '2026-09-21 15:21:40', 'document', 'info', '/documents/85', 'document', 85, 'yop v', '2026-09-21 22:54:02', 0),
(51, 1, '\"3 agree 1\" is completed', 'All recipients have signed. The signed documents and the certificate of completion were emailed to everyone.', 1, 'success', '2026-09-21 15:22:38', 'document', 'success', '/documents/85', 'document', 85, NULL, '2026-09-21 22:53:13', 0),
(59, 1, 'Deployment API token created', '\"PHASETEST integration\" can call the BexSign API as you for 30 days. Revoke it if you did not create it.', 0, 'warning', '2026-09-22 16:37:37', 'api', 'warning', '/settings/developer-api?tab=keys', 'api_key', 6, NULL, NULL, 0);

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
  `notify_reminders` tinyint(1) DEFAULT 1,
  `preferences` longtext DEFAULT NULL,
  `email_digest` varchar(20) NOT NULL DEFAULT 'off',
  `muted_until` datetime DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `password_reset_tokens`
--

CREATE TABLE `password_reset_tokens` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `token_hash` char(64) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `requested_ip` varchar(64) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `password_reset_tokens`
--

INSERT INTO `password_reset_tokens` (`id`, `user_id`, `token_hash`, `expires_at`, `used_at`, `requested_ip`, `created_at`) VALUES
(4, 1, '7d44d20231120650e5582b92b947923fa45f881528e269e41cbedba23450ce40', '2026-09-18 16:52:59', '2026-09-18 15:54:58', '::1', '2026-09-18 10:22:59');

-- --------------------------------------------------------

--
-- Table structure for table `permissions`
--

CREATE TABLE `permissions` (
  `id` int(11) NOT NULL,
  `permission_key` varchar(80) NOT NULL,
  `module` varchar(60) NOT NULL,
  `label` varchar(120) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `sort_order` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `permissions`
--

INSERT INTO `permissions` (`id`, `permission_key`, `module`, `label`, `description`, `sort_order`, `created_at`) VALUES
(1, 'documents.view_own', 'documents', 'View own documents', 'See documents the user created or received', 0, '2026-09-18 18:13:25'),
(2, 'documents.view_team', 'documents', 'View team documents', 'See documents created by members of the same department', 1, '2026-09-18 18:13:26'),
(3, 'documents.view_all', 'documents', 'View all documents', 'See every document in the organization', 2, '2026-09-18 18:13:26'),
(4, 'documents.create', 'documents', 'Create documents', 'Upload documents and create drafts', 3, '2026-09-18 18:13:26'),
(5, 'documents.send', 'documents', 'Send for signature', 'Send requests to recipients', 4, '2026-09-18 18:13:26'),
(6, 'documents.recall', 'documents', 'Recall and correct', 'Recall, correct or extend sent requests', 5, '2026-09-18 18:13:26'),
(7, 'documents.download', 'documents', 'Download and print', 'Download signed PDFs and certificates', 6, '2026-09-18 18:13:26'),
(8, 'documents.delete', 'documents', 'Delete documents', 'Move documents to trash and delete them', 7, '2026-09-18 18:13:26'),
(9, 'templates.view', 'templates', 'Use templates', 'Browse and use templates', 8, '2026-09-18 18:13:26'),
(10, 'templates.create', 'templates', 'Create templates', 'Save new templates', 9, '2026-09-18 18:13:26'),
(11, 'templates.edit', 'templates', 'Edit templates', 'Change templates they can manage', 10, '2026-09-18 18:13:26'),
(12, 'templates.delete', 'templates', 'Delete templates', 'Delete templates they can manage', 11, '2026-09-18 18:13:26'),
(13, 'templates.share', 'templates', 'Share templates', 'Share templates with the whole organization', 12, '2026-09-18 18:13:26'),
(14, 'signatures.manage', 'signatures', 'Manage signatures', 'Create and change their saved signatures and stamps', 13, '2026-09-18 18:13:26'),
(15, 'reports.view', 'reports', 'View reports', 'Open reports and the timeline', 14, '2026-09-18 18:13:26'),
(16, 'reports.export', 'reports', 'Export reports', 'Download reports as CSV', 15, '2026-09-18 18:13:26'),
(17, 'reports.schedule', 'reports', 'Schedule reports', 'Create scheduled report emails', 16, '2026-09-18 18:13:26'),
(18, 'users.view', 'users', 'View users', 'See the users of the organization', 17, '2026-09-18 18:13:26'),
(19, 'users.invite', 'users', 'Add users', 'Create and invite users', 18, '2026-09-18 18:13:26'),
(20, 'users.edit', 'users', 'Edit users', 'Change user details and roles', 19, '2026-09-18 18:13:26'),
(21, 'users.deactivate', 'users', 'Activate or deactivate users', 'Block or restore access of users', 20, '2026-09-18 18:13:26'),
(22, 'users.delete', 'users', 'Delete users', 'Remove users permanently', 21, '2026-09-18 18:13:26'),
(23, 'roles.manage', 'permissions', 'Manage roles and permissions', 'Change role permissions and user overrides', 22, '2026-09-18 18:13:27'),
(24, 'settings.general', 'settings', 'General settings', 'Change organization-wide settings', 23, '2026-09-18 18:13:27'),
(25, 'settings.integrations', 'settings', 'Integrations', 'Connect and configure integrations', 24, '2026-09-18 18:13:27'),
(26, 'settings.developer', 'settings', 'Developer settings', 'Change API and webhook settings', 25, '2026-09-18 18:13:27'),
(27, 'security.failed_access', 'security', 'Failed access log', 'View and resolve failed access attempts', 26, '2026-09-18 18:13:27'),
(28, 'security.document_validity', 'security', 'Document validity', 'Verify documents and see verification history', 27, '2026-09-18 18:13:27'),
(29, 'security.activity_history', 'security', 'Activity history', 'View the activity history of the organization', 28, '2026-09-18 18:13:27'),
(30, 'api.keys', 'api', 'API keys', 'Create and revoke API keys', 29, '2026-09-18 18:13:27'),
(31, 'api.webhooks', 'api', 'Webhooks', 'Create and manage webhooks', 30, '2026-09-18 18:13:27'),
(32, 'api.logs', 'api', 'API logs', 'View API request logs', 31, '2026-09-18 18:13:27'),
(33, 'notifications.broadcast', 'notifications', 'Send announcements', 'Send a notification to every user', 32, '2026-09-18 18:13:27');

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
-- Table structure for table `report_runs`
--

CREATE TABLE `report_runs` (
  `id` int(11) NOT NULL,
  `scheduled_report_id` int(11) DEFAULT NULL,
  `report_type` varchar(60) DEFAULT NULL,
  `triggered_by` varchar(20) DEFAULT 'schedule',
  `status` varchar(20) DEFAULT 'success',
  `row_count` int(11) DEFAULT 0,
  `recipients` text DEFAULT NULL,
  `file_name` varchar(255) DEFAULT NULL,
  `error` text DEFAULT NULL,
  `run_at` timestamp NOT NULL DEFAULT current_timestamp()
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
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `is_system` tinyint(1) NOT NULL DEFAULT 0,
  `color` varchar(20) DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`id`, `role_key`, `role_name`, `description`, `permissions`, `created_at`, `is_system`, `color`, `updated_at`) VALUES
(1, 'manager', 'Manager (Admin)', 'Complete administrative access over all users, roles, organizational documents, templates, audit trails, and system settings.', '{\"all\":true,\"manage_users\":true,\"manage_roles\":true,\"manage_all_docs\":true,\"delete_docs\":true,\"manage_settings\":true,\"manage_templates\":true,\"view_audit_logs\":true,\"export_reports\":true}', '2026-09-10 19:06:36', 1, NULL, '2026-09-18 18:13:27'),
(2, 'leader', 'Leader (Team Admin)', 'Team leadership access to manage team members, invite users, oversee team documents, share templates, and view team reports.', '{\"manage_team\":true,\"invite_members\":true,\"view_team_docs\":true,\"create_docs\":true,\"manage_templates\":true,\"view_reports\":true,\"sign_docs\":true}', '2026-09-10 19:06:36', 1, NULL, '2026-09-18 18:13:27'),
(3, 'team_member', 'Team Member', 'Standard operational user access to create, send, and sign documents, use shared templates, and manage own profile.', '{\"create_docs\":true,\"sign_docs\":true,\"view_own_docs\":true,\"view_templates\":true,\"manage_profile\":true}', '2026-09-10 19:06:36', 1, NULL, '2026-09-18 18:13:27');

-- --------------------------------------------------------

--
-- Table structure for table `role_permissions`
--

CREATE TABLE `role_permissions` (
  `id` int(11) NOT NULL,
  `role_key` varchar(50) NOT NULL,
  `permission_key` varchar(80) NOT NULL,
  `allowed` tinyint(1) NOT NULL DEFAULT 1,
  `updated_by` int(11) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `role_permissions`
--

INSERT INTO `role_permissions` (`id`, `role_key`, `permission_key`, `allowed`, `updated_by`, `updated_at`) VALUES
(1, 'manager', 'documents.view_own', 1, NULL, '2026-09-18 18:13:27'),
(2, 'manager', 'documents.view_team', 1, NULL, '2026-09-18 18:13:27'),
(3, 'manager', 'documents.view_all', 1, NULL, '2026-09-18 18:13:27'),
(4, 'manager', 'documents.create', 1, NULL, '2026-09-18 18:13:27'),
(5, 'manager', 'documents.send', 1, NULL, '2026-09-18 18:13:27'),
(6, 'manager', 'documents.recall', 1, NULL, '2026-09-18 18:13:27'),
(7, 'manager', 'documents.download', 1, NULL, '2026-09-18 18:13:28'),
(8, 'manager', 'documents.delete', 1, NULL, '2026-09-18 18:13:28'),
(9, 'manager', 'templates.view', 1, NULL, '2026-09-18 18:13:28'),
(10, 'manager', 'templates.create', 1, NULL, '2026-09-18 18:13:28'),
(11, 'manager', 'templates.edit', 1, NULL, '2026-09-18 18:13:28'),
(12, 'manager', 'templates.delete', 1, NULL, '2026-09-18 18:13:28'),
(13, 'manager', 'templates.share', 1, NULL, '2026-09-18 18:13:28'),
(14, 'manager', 'signatures.manage', 1, NULL, '2026-09-18 18:13:28'),
(15, 'manager', 'reports.view', 1, NULL, '2026-09-18 18:13:28'),
(16, 'manager', 'reports.export', 1, NULL, '2026-09-18 18:13:28'),
(17, 'manager', 'reports.schedule', 1, NULL, '2026-09-18 18:13:28'),
(18, 'manager', 'users.view', 1, NULL, '2026-09-18 18:13:28'),
(19, 'manager', 'users.invite', 1, NULL, '2026-09-18 18:13:28'),
(20, 'manager', 'users.edit', 1, NULL, '2026-09-18 18:13:28'),
(21, 'manager', 'users.deactivate', 1, NULL, '2026-09-18 18:13:28'),
(22, 'manager', 'users.delete', 1, NULL, '2026-09-18 18:13:29'),
(23, 'manager', 'roles.manage', 1, NULL, '2026-09-18 18:13:29'),
(24, 'manager', 'settings.general', 1, NULL, '2026-09-18 18:13:29'),
(25, 'manager', 'settings.integrations', 1, NULL, '2026-09-18 18:13:29'),
(26, 'manager', 'settings.developer', 1, NULL, '2026-09-18 18:13:29'),
(27, 'manager', 'security.failed_access', 1, NULL, '2026-09-18 18:13:29'),
(28, 'manager', 'security.document_validity', 1, NULL, '2026-09-18 18:13:29'),
(29, 'manager', 'security.activity_history', 1, NULL, '2026-09-18 18:13:29'),
(30, 'manager', 'api.keys', 1, NULL, '2026-09-18 18:13:29'),
(31, 'manager', 'api.webhooks', 1, NULL, '2026-09-18 18:13:29'),
(32, 'manager', 'api.logs', 1, NULL, '2026-09-18 18:13:29'),
(33, 'manager', 'notifications.broadcast', 1, NULL, '2026-09-18 18:13:29'),
(34, 'leader', 'documents.view_own', 1, NULL, '2026-09-18 18:13:29'),
(35, 'leader', 'documents.view_team', 1, NULL, '2026-09-18 18:13:29'),
(36, 'leader', 'documents.view_all', 0, NULL, '2026-09-18 18:13:29'),
(37, 'leader', 'documents.create', 1, NULL, '2026-09-18 18:13:29'),
(38, 'leader', 'documents.send', 1, NULL, '2026-09-18 18:13:29'),
(39, 'leader', 'documents.recall', 1, NULL, '2026-09-18 18:13:29'),
(40, 'leader', 'documents.download', 1, NULL, '2026-09-18 18:13:29'),
(41, 'leader', 'documents.delete', 0, NULL, '2026-09-18 18:13:29'),
(42, 'leader', 'templates.view', 1, NULL, '2026-09-18 18:13:29'),
(43, 'leader', 'templates.create', 1, NULL, '2026-09-18 18:13:30'),
(44, 'leader', 'templates.edit', 1, NULL, '2026-09-18 18:13:30'),
(45, 'leader', 'templates.delete', 0, NULL, '2026-09-18 18:13:30'),
(46, 'leader', 'templates.share', 1, NULL, '2026-09-18 18:13:30'),
(47, 'leader', 'signatures.manage', 1, NULL, '2026-09-18 18:13:30'),
(48, 'leader', 'reports.view', 1, NULL, '2026-09-18 18:13:30'),
(49, 'leader', 'reports.export', 1, NULL, '2026-09-18 18:13:30'),
(50, 'leader', 'reports.schedule', 1, NULL, '2026-09-18 18:13:30'),
(51, 'leader', 'users.view', 1, NULL, '2026-09-18 18:13:30'),
(52, 'leader', 'users.invite', 1, NULL, '2026-09-18 18:13:30'),
(53, 'leader', 'users.edit', 0, NULL, '2026-09-18 18:13:30'),
(54, 'leader', 'users.deactivate', 0, NULL, '2026-09-18 18:13:30'),
(55, 'leader', 'users.delete', 0, NULL, '2026-09-18 18:13:30'),
(56, 'leader', 'roles.manage', 0, NULL, '2026-09-18 18:13:30'),
(57, 'leader', 'settings.general', 0, NULL, '2026-09-18 18:13:30'),
(58, 'leader', 'settings.integrations', 0, NULL, '2026-09-18 18:13:30'),
(59, 'leader', 'settings.developer', 0, NULL, '2026-09-18 18:13:30'),
(60, 'leader', 'security.failed_access', 0, NULL, '2026-09-18 18:13:30'),
(61, 'leader', 'security.document_validity', 1, NULL, '2026-09-18 18:13:30'),
(62, 'leader', 'security.activity_history', 1, NULL, '2026-09-18 18:13:30'),
(63, 'leader', 'api.keys', 0, NULL, '2026-09-18 18:13:30'),
(64, 'leader', 'api.webhooks', 0, NULL, '2026-09-18 18:13:30'),
(65, 'leader', 'api.logs', 0, NULL, '2026-09-18 18:13:30'),
(66, 'leader', 'notifications.broadcast', 0, NULL, '2026-09-18 18:13:30'),
(67, 'team_member', 'documents.view_own', 1, NULL, '2026-09-18 18:13:30'),
(68, 'team_member', 'documents.view_team', 0, NULL, '2026-09-18 18:13:31'),
(69, 'team_member', 'documents.view_all', 0, NULL, '2026-09-18 18:13:31'),
(70, 'team_member', 'documents.create', 1, NULL, '2026-09-18 18:13:31'),
(71, 'team_member', 'documents.send', 1, NULL, '2026-09-18 18:13:31'),
(72, 'team_member', 'documents.recall', 0, NULL, '2026-09-18 18:13:31'),
(73, 'team_member', 'documents.download', 1, NULL, '2026-09-18 18:13:31'),
(74, 'team_member', 'documents.delete', 0, NULL, '2026-09-18 18:13:31'),
(75, 'team_member', 'templates.view', 1, NULL, '2026-09-18 18:13:31'),
(76, 'team_member', 'templates.create', 1, NULL, '2026-09-18 18:13:31'),
(77, 'team_member', 'templates.edit', 0, NULL, '2026-09-18 18:13:31'),
(78, 'team_member', 'templates.delete', 0, NULL, '2026-09-18 18:13:31'),
(79, 'team_member', 'templates.share', 0, NULL, '2026-09-18 18:13:31'),
(80, 'team_member', 'signatures.manage', 1, NULL, '2026-09-18 18:13:31'),
(81, 'team_member', 'reports.view', 1, NULL, '2026-09-18 18:13:31'),
(82, 'team_member', 'reports.export', 0, NULL, '2026-09-18 18:13:31'),
(83, 'team_member', 'reports.schedule', 0, NULL, '2026-09-18 18:13:31'),
(84, 'team_member', 'users.view', 0, NULL, '2026-09-18 18:13:31'),
(85, 'team_member', 'users.invite', 0, NULL, '2026-09-18 18:13:31'),
(86, 'team_member', 'users.edit', 0, NULL, '2026-09-18 18:13:31'),
(87, 'team_member', 'users.deactivate', 0, NULL, '2026-09-18 18:13:31'),
(88, 'team_member', 'users.delete', 0, NULL, '2026-09-18 18:13:32'),
(89, 'team_member', 'roles.manage', 0, NULL, '2026-09-18 18:13:32'),
(90, 'team_member', 'settings.general', 0, NULL, '2026-09-18 18:13:32'),
(91, 'team_member', 'settings.integrations', 0, NULL, '2026-09-18 18:13:32'),
(92, 'team_member', 'settings.developer', 0, NULL, '2026-09-18 18:13:32'),
(93, 'team_member', 'security.failed_access', 0, NULL, '2026-09-18 18:13:32'),
(94, 'team_member', 'security.document_validity', 0, NULL, '2026-09-18 18:13:32'),
(95, 'team_member', 'security.activity_history', 0, NULL, '2026-09-18 18:13:32'),
(96, 'team_member', 'api.keys', 0, NULL, '2026-09-18 18:13:32'),
(97, 'team_member', 'api.webhooks', 0, NULL, '2026-09-18 18:13:32'),
(98, 'team_member', 'api.logs', 0, NULL, '2026-09-18 18:13:32'),
(99, 'team_member', 'notifications.broadcast', 0, NULL, '2026-09-18 18:13:32');

-- --------------------------------------------------------

--
-- Table structure for table `scheduled_reports`
--

CREATE TABLE `scheduled_reports` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL,
  `frequency` enum('daily','weekly','monthly') DEFAULT 'weekly',
  `recipient_email` varchar(255) NOT NULL,
  `report_type` varchar(60) NOT NULL DEFAULT 'document_summary',
  `format` varchar(10) NOT NULL DEFAULT 'csv',
  `recipients` text DEFAULT NULL,
  `filters` text DEFAULT NULL,
  `day_of_week` tinyint(4) DEFAULT NULL,
  `day_of_month` tinyint(4) DEFAULT NULL,
  `time_of_day` varchar(5) NOT NULL DEFAULT '09:00',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `last_run_at` datetime DEFAULT NULL,
  `next_run_at` datetime DEFAULT NULL,
  `last_status` varchar(20) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `self_sign_documents`
--

CREATE TABLE `self_sign_documents` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `document_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `stage` enum('draft','prepared','signed') NOT NULL DEFAULT 'draft',
  `source` enum('upload','template','created','merged') NOT NULL DEFAULT 'upload',
  `template_name` varchar(255) DEFAULT NULL,
  `has_fields` tinyint(1) NOT NULL DEFAULT 0,
  `field_count` int(11) NOT NULL DEFAULT 0,
  `page_count` int(11) NOT NULL DEFAULT 1,
  `signed_at` datetime DEFAULT NULL,
  `signed_file_path` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `self_sign_documents`
--

INSERT INTO `self_sign_documents` (`id`, `user_id`, `document_id`, `title`, `stage`, `source`, `template_name`, `has_fields`, `field_count`, `page_count`, `signed_at`, `signed_file_path`, `created_at`, `updated_at`) VALUES
(9, 1, 101, 'my sign doc 1', 'signed', 'created', NULL, 1, 2, 1, '2026-09-22 19:44:48', '/uploads/completed/101/01-my-sign-doc-1.pdf', '2026-09-22 14:14:09', '2026-09-22 14:14:56');

-- --------------------------------------------------------

--
-- Table structure for table `self_sign_events`
--

CREATE TABLE `self_sign_events` (
  `id` int(11) NOT NULL,
  `self_sign_id` int(11) NOT NULL,
  `document_id` int(11) DEFAULT NULL,
  `action` varchar(40) NOT NULL,
  `detail` varchar(500) DEFAULT NULL,
  `actor_id` int(11) DEFAULT NULL,
  `actor_name` varchar(150) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `self_sign_events`
--

INSERT INTO `self_sign_events` (`id`, `self_sign_id`, `document_id`, `action`, `detail`, `actor_id`, `actor_name`, `ip_address`, `created_at`) VALUES
(40, 9, 101, 'created', '\"my sign doc 1\" created from created with 1 document (BEX-DOC-2026-0101-8GLCPO4X-5GNBKPYXFOTGQ8GSE3IR7C)', 1, 'Vimal Chavda', '::1', '2026-09-22 14:14:09'),
(41, 9, 101, 'document_added', 'Added \"my sign doc 1.pdf\"', 1, 'Vimal Chavda', '::1', '2026-09-22 14:14:10'),
(42, 9, 101, 'fields_placed', '2 fields placed - the document is ready to sign', 1, 'Vimal Chavda', '::1', '2026-09-22 14:14:47'),
(43, 9, 101, 'signed', 'Signed by Vimal Chavda (vimal@bexcodeservices.com) with 2 fields using the signature \"BEX-SIGN-VC-EMP001-2026-361682B4\"', 1, 'Vimal Chavda', '::1', '2026-09-22 14:14:56'),
(44, 9, 101, 'downloaded', 'Downloaded the signed \"my sign doc 1.pdf\"', 1, 'Vimal Chavda', '::1', '2026-09-22 14:15:34'),
(45, 9, 101, 'downloaded', 'Downloaded the signed \"my sign doc 1.pdf\"', 1, 'Vimal Chavda', '::1', '2026-09-22 18:04:50');

-- --------------------------------------------------------

--
-- Table structure for table `self_sign_shares`
--

CREATE TABLE `self_sign_shares` (
  `id` int(11) NOT NULL,
  `self_sign_id` int(11) NOT NULL,
  `document_id` int(11) DEFAULT NULL,
  `recipient_email` varchar(255) NOT NULL,
  `recipient_name` varchar(150) DEFAULT NULL,
  `message` text DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'sent',
  `error_message` varchar(500) DEFAULT NULL,
  `shared_by` int(11) DEFAULT NULL,
  `shared_at` timestamp NOT NULL DEFAULT current_timestamp()
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
(64, 42, 38, 'sent', NULL, NULL, '2026-09-16 17:42:32'),
(65, 42, 38, 'viewed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-16 17:43:00'),
(66, 42, 38, 'signed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-16 18:44:00'),
(67, 42, 37, 'sent', NULL, NULL, '2026-09-16 18:44:04'),
(76, 42, 37, 'viewed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-16 19:07:12'),
(77, 42, 37, 'signed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-16 19:07:25'),
(78, 48, 47, 'sent', NULL, NULL, '2026-09-17 13:09:37'),
(79, 48, 47, 'viewed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-17 13:09:59'),
(80, 48, 47, 'signed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-17 13:17:47'),
(81, 48, 48, 'sent', NULL, NULL, '2026-09-17 13:17:52'),
(82, 48, 48, 'viewed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-17 13:19:43'),
(83, 48, 48, 'signed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-17 13:20:04'),
(84, 49, 51, 'sent', NULL, NULL, '2026-09-17 14:28:03'),
(85, 49, 51, 'viewed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-17 14:28:39'),
(86, 49, 51, 'signed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-17 14:29:42'),
(87, 49, 50, 'sent', NULL, NULL, '2026-09-17 14:29:46'),
(88, 49, 50, 'viewed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-17 14:30:13'),
(89, 49, 50, 'signed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-17 14:30:31'),
(118, 60, 75, 'sent', NULL, NULL, '2026-09-18 06:35:30'),
(119, 60, 75, 'viewed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-18 06:37:17'),
(120, 60, 75, 'signed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-18 06:51:43'),
(121, 60, 74, 'sent', NULL, NULL, '2026-09-18 06:51:47'),
(122, 60, 74, 'viewed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-18 08:03:11'),
(123, 60, 74, 'viewed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-18 08:03:11'),
(124, 60, 74, 'signed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-18 08:03:33'),
(133, 52, 57, 'sent', NULL, NULL, '2026-09-18 08:15:03'),
(134, 52, 58, 'sent', NULL, NULL, '2026-09-18 08:15:07'),
(135, 52, 58, 'viewed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-18 08:15:24'),
(136, 52, 57, 'viewed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-18 08:17:20'),
(137, 52, 57, 'viewed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-18 08:17:20'),
(138, 52, 57, 'signed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-18 08:17:43'),
(139, 67, 87, 'viewed', '127.0.0.1', 'curl/7.78.0', '2026-09-18 18:31:59'),
(140, 67, 88, 'declined', '127.0.0.1', 'curl/7.78.0', '2026-09-18 18:32:00'),
(141, 67, 87, 'sent', NULL, NULL, '2026-09-18 18:32:19'),
(142, 67, 87, 'reminded', NULL, NULL, '2026-09-18 18:32:20'),
(143, 68, 89, 'sent', NULL, NULL, '2026-09-21 13:24:38'),
(144, 68, 90, 'sent', NULL, NULL, '2026-09-21 13:24:42'),
(145, 65, 85, 'sent', NULL, NULL, '2026-09-21 13:26:28'),
(146, 65, 91, 'sent', NULL, NULL, '2026-09-21 13:26:32'),
(178, 63, 81, 'sent', NULL, NULL, '2026-09-21 14:34:49'),
(179, 63, 82, 'sent', NULL, NULL, '2026-09-21 14:34:53'),
(200, 85, 137, 'sent', NULL, NULL, '2026-09-21 15:13:02'),
(201, 85, 137, 'viewed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-21 15:20:04'),
(202, 85, 137, 'signed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-21 15:20:22'),
(203, 85, 138, 'sent', NULL, NULL, '2026-09-21 15:20:27'),
(204, 85, 138, 'viewed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-21 15:20:42'),
(205, 85, 138, 'viewed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-21 15:20:42'),
(206, 85, 138, 'signed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-21 15:21:25'),
(207, 85, 139, 'sent', NULL, NULL, '2026-09-21 15:21:29'),
(208, 85, 139, 'viewed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-21 15:21:40'),
(209, 85, 139, 'signed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-21 15:22:37');

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
-- Table structure for table `signature_usage_log`
--

CREATE TABLE `signature_usage_log` (
  `id` int(11) NOT NULL,
  `signature_id` int(11) DEFAULT NULL,
  `owner_email` varchar(255) NOT NULL,
  `document_id` int(11) DEFAULT NULL,
  `document_name` varchar(255) DEFAULT NULL,
  `context` enum('signing_request','self_sign','directory_prefill','manual') NOT NULL DEFAULT 'manual',
  `recipient_id` int(11) DEFAULT NULL,
  `signer_name` varchar(150) DEFAULT NULL,
  `signer_email` varchar(255) DEFAULT NULL,
  `field_count` int(11) DEFAULT NULL,
  `ip_address` varchar(64) DEFAULT NULL,
  `used_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `signature_usage_log`
--

INSERT INTO `signature_usage_log` (`id`, `signature_id`, `owner_email`, `document_id`, `document_name`, `context`, `recipient_id`, `signer_name`, `signer_email`, `field_count`, `ip_address`, `used_at`) VALUES
(16, 2, 'vimal@bexcodeservices.com', 101, 'my sign doc 1', 'self_sign', NULL, 'Vimal Chavda', 'vimal@bexcodeservices.com', 2, '::1', '2026-09-22 14:14:56');

-- --------------------------------------------------------

--
-- Table structure for table `signing_email_dispatch`
--

CREATE TABLE `signing_email_dispatch` (
  `id` int(11) NOT NULL,
  `document_id` int(11) NOT NULL,
  `recipient_id` int(11) DEFAULT NULL,
  `recipient_email` varchar(255) NOT NULL,
  `recipient_name` varchar(150) DEFAULT NULL,
  `step_index` int(11) NOT NULL DEFAULT 1,
  `email_type` varchar(20) NOT NULL DEFAULT 'invitation',
  `trigger_source` varchar(30) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'sent',
  `error_message` varchar(500) DEFAULT NULL,
  `sent_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `signing_email_dispatch`
--

INSERT INTO `signing_email_dispatch` (`id`, `document_id`, `recipient_id`, `recipient_email`, `recipient_name`, `step_index`, `email_type`, `trigger_source`, `status`, `error_message`, `sent_at`, `created_at`) VALUES
(34, 85, 137, 'vimal@bexcodeservices.com', 'Vimal bex', 1, 'invitation', 'send', 'sent', NULL, '2026-09-21 20:43:02', '2026-09-21 15:13:02'),
(35, 85, 138, 'chavdavimaln@gmail.com', 'cnv', 2, 'invitation', 'next_in_order', 'sent', NULL, '2026-09-21 20:50:27', '2026-09-21 15:20:27'),
(36, 85, 139, 'vnc@yopmail.com', 'yop v', 3, 'invitation', 'next_in_order', 'sent', NULL, '2026-09-21 20:51:28', '2026-09-21 15:21:28');

-- --------------------------------------------------------

--
-- Table structure for table `templates`
--

CREATE TABLE `templates` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `file_path` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `category` varchar(60) DEFAULT NULL,
  `content` longtext DEFAULT NULL,
  `is_shared` tinyint(1) NOT NULL DEFAULT 1,
  `usage_count` int(11) NOT NULL DEFAULT 0,
  `source_template` varchar(120) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
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
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `job_title` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `first_name`, `last_name`, `email`, `username`, `password_hash`, `company`, `phone`, `role`, `is_verified`, `created_at`, `updated_at`, `job_title`) VALUES
(1, 'Vimal', 'Chavda', 'vimal@bexcodeservices.com', NULL, '$2a$10$EPcWmWAKaWdmi.iVbKtvgOGfQqy54KA6rJnR7L0l6TUImSbsUCASS', NULL, NULL, 'manager', 0, '2026-08-27 09:56:08', '2026-09-18 10:24:58', NULL),
(2, 'Manu', 'Yadav', 'admin@bexsign.com', NULL, '$2a$10$fGRxOZbEzsHrJnm4Xw07eOFY24noqWXVYGl3Tk.7A9qIMS8F8NUNC', 'Dcode Health', NULL, 'leader', 1, '2026-08-27 15:11:32', '2026-09-15 19:09:18', NULL),
(3, 'Aakash', 'Shah', 'aakash@bexcodeservices.com', NULL, '$2a$10$mMvjkfZn6cWTluvYRjtVo.aMO/LpYclC/P7mplxyCay1aFtlYfFdS', 'BexSign Workspace', NULL, 'leader', 0, '2026-09-10 19:08:43', '2026-09-10 19:08:43', NULL),
(4, 'Dhruv', 'Patel', 'dhruv@bexcodeservices.com', NULL, '$2a$10$Nf1TJebBX/l9/su5x8.LUuIbDb78R7FUGa7NUkQ4BCTF96LX8LpgK', 'BexSign Workspace', NULL, 'team_member', 0, '2026-09-10 19:08:53', '2026-09-18 18:30:55', NULL);

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

--
-- Dumping data for table `user_login_logs`
--

INSERT INTO `user_login_logs` (`id`, `user_id`, `email`, `role`, `ip_address`, `user_agent`, `status`, `login_at`) VALUES
(3, 1, 'vimal@bexcodeservices.com', 'manager', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'success', '2026-09-18 10:27:43'),
(4, 4, 'dhruv@bexcodeservices.com', 'team_member', '::ffff:127.0.0.1', 'curl/7.78.0', 'failed', '2026-09-18 18:31:16'),
(5, 1, 'vimal@bexcodeservices.com', 'manager', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'success', '2026-09-21 10:25:38');

-- --------------------------------------------------------

--
-- Table structure for table `user_permissions`
--

CREATE TABLE `user_permissions` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `permission_key` varchar(80) NOT NULL,
  `allowed` tinyint(1) NOT NULL DEFAULT 1,
  `reason` varchar(255) DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `granted_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
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
-- Table structure for table `user_signatures`
--

CREATE TABLE `user_signatures` (
  `id` int(11) NOT NULL,
  `owner_user_id` int(11) DEFAULT NULL,
  `owner_email` varchar(255) NOT NULL,
  `display_name` varchar(150) NOT NULL,
  `employee_code` varchar(50) DEFAULT NULL,
  `designation` varchar(100) DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `initials` varchar(10) DEFAULT NULL,
  `signature_id` varchar(100) NOT NULL,
  `method` enum('type','draw','upload') NOT NULL DEFAULT 'type',
  `signature_image` longtext DEFAULT NULL,
  `signature_style` varchar(50) NOT NULL DEFAULT 'font-signature-1',
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `status` varchar(20) NOT NULL DEFAULT 'Active',
  `legacy_employee_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_signatures`
--

INSERT INTO `user_signatures` (`id`, `owner_user_id`, `owner_email`, `display_name`, `employee_code`, `designation`, `department`, `initials`, `signature_id`, `method`, `signature_image`, `signature_style`, `is_default`, `status`, `legacy_employee_id`, `created_at`, `updated_at`) VALUES
(1, 4, 'dhruv@bexcodeservices.com', 'Dhruv Patel', 'EMP003', 'Quality Lead', 'Quality Assurance', 'DP', 'BEX-SIGN-DP-EMP003-2026-928371C3', 'type', NULL, 'font-signature-1', 1, 'Active', 3, '2026-09-01 19:43:38', '2026-09-21 16:48:12'),
(2, 1, 'vimal@bexcodeservices.com', 'Vimal Chavda', 'EMP001', 'Software Specialist', 'Engineering', 'VC', 'BEX-SIGN-VC-EMP001-2026-361682B4', 'upload', 'data:image/png;base64,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', 'font-signature-3', 1, 'Active', 1, '2026-09-01 19:43:38', '2026-09-21 16:38:02'),
(3, NULL, 'manu.yadav@oladigital.health', 'Manu Yadav', 'EMP002', 'Operations Director', 'Operations', 'MY', 'BEX-SIGN-MY-EMP002-2026-781920A1', 'type', NULL, 'font-signature-2', 1, 'Active', 2, '2026-09-01 19:43:38', '2026-09-21 16:35:39'),
(4, NULL, 'chavdavimaln@gmail.com', 'cvn', 'EMP524', 'Software Specialist', 'Engineering', 'V', 'BEX-SIGN-V-EMP524-2026-4A0319B439CD1CF0', 'upload', 'data:image/png;base64,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', 'font-signature-2', 1, 'Active', 7, '2026-09-16 10:51:35', '2026-09-21 16:35:39'),
(5, NULL, 'vnc@yopmail.com', 'vnc yop mail', 'EMP228', 'Software Specialist', 'Engineering', 'VYM', 'BEX-SIGN-VYM-EMP228-2026-BD7C761738BE2488', 'upload', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQkAAABmCAYAAADYvWRfAAAQAElEQVR4Aex9CXxcVfX/Oe/NpOmSmaS2mSlUqSzSTAoiFQTZ+nOXRVARBX4gyOICyiarIH+VnwIKyOYPWf6iPzf8AQriXxAQ3JBFFKFJWq1QFdpMWpuZpE2aZN47/+95M2/yZua9dJqksS13Pve8u527vHPvPffcc++7Y5H5GQoYChgKjEEBwyTGII6JMhQwFCAyTML0AkMBQ4ExKWCYxJjkMZGGAlNLga2xNMMktsZWMXUyFNiKKGCYxFbUGKYqhgJbIwUMk9gaW8XUyVBgK6KAYRJbUWOYqkwtBUxp9VHAMIn66GSwDAVetRQwTOJV2/TmxQ0F6qOAYRL10clgGQq8ailgmMSrtumn9sVNadsuBQyT2HbbztTcUGBKKGCYxJSQ2RRiKLDtUsAwiW237UzNDQWmhAKGSUwJmae2EFOaocBkUsAwicmkpsnLUGA7pIBhEttho5pXMhSYTAoYJjGZ1DR5GQpshxQwTGKCjWqSGwps7xQwTGJ7b2HzfoYCE6SAYRITJKBJbiiwvVPAMIntvYXN+xkKENmJdNthiXTmN8nWzLJkqu3DIAoD6jLbFJOo640MkqGAoUCZAjPnZtLJVOYhFn6AhQ4kpt2J+DtNrQv3ozp/hknUSSiDZiiwrVGgeV7bTrZFj6DebwcETYNF1p7BgLHchkmMRR0TZyiwjVKgpWXnpLh8B9YU7f4rwP1dS6w3wt8N90zYdRnDJOoik0EyFNimKMDutGkfR42DEsSjPLzxTI5b6xDuMPNfYddlIplEXakNkqGAocBWR4HZ6UyGhM8PVCwnTJf09r6Yl+HCAoQ7IxavgF2XMUyiLjIZJEOBbYUCS2KO8Dmo7RyAZ6CwvKKvu/Np9bg2HwD7pekF95+w6zKGSdRFJoNkKLBtUKBlXs/+RHJCoLa/igt9U/2qpyCR9xPzz9es6VyvYfWAYRL1UMngGAr8uylQR/nz58+fLq5cANQGgBoXTOG/fIbgxKaDgVBaHLpHI+sFwyTqpZTBMxTYyinQP9x0oBAfGqjmPfmeGY+rXxmIZblnsMgDfWs6/qZh9YJhEvVSyuAZCkwxBRLp9n2SqUwXQJKptof0YFRUFZQJMNNnEO+P6WHLohuJnh1BGG1wEm8m4sViy7cI6xFA3cbPsO4EBtFQwFBgy1MgMbd9V0vkPpS0EADD74rb9Ak4Qk2IFHFf7+rpTxaRF8ddlz4NKeNX+dXpPxfD6n8aJlE/rQzmq4UCW8F7MsvbhWhesCoiFA/6ffempIiWeYN6BHuJK84NRI8X/HT12oZJ1Espg2coMIUUYObVVcXl2KW7q8I8b3541l5C/C7PU3yUpQhlIEVlJt/f35N+phi9eU/DJDaPXgbbUGBKKJDLNv4cSsabS4UtY3aPyq3p/FPJH7CWxCy2VRcR3NG4zddFrB9ufi8YyAFkOf89HilCCzJMQqlgwFBgq6PAsyO5nq4z89lOBrTlupf9KqyKLaksdBbynnIc08NNDf2/VX/TjgtfI+xeBCbxnfzqZX/UsPGAYRLjoZpJM3kUMDlNiALCfDQyaAaoEXH46y+//PKgeizHPpWJ5pNLN8EvgHGZrYpJNKcXHoLtHm/LJ5HOXIM3wjviaYyhgKFADQVmti5KQZmpF8j4cU/bhcHfq2d2OtNOIuci/ot9azrq/k5D01bDlmYS9uwd95zfkmo/ItGaOb55bmav6gr4fjCFfUWsn8AP8YkI3GEnoiU2/ft+dlProrcmU+0/TKYy6wHYq84orERdzyRaHKpp3tzqzt5h0Wub0+0fTabbv4G98FsVmlvbjorKR/ETqbaPNKcyN3i4qcyNza3t+vlvVJJS+OI4yjg6mco8BXAA+i5Z5PG5VGrPMT8bnj1710Qi3XZoQtswlbkhkW7/diLVfl1Ly87JUuYVlrY58r8LoOUo/KxpzsI3VCBtfx7Wd0y2tl+F914BUPoq6Ps/39yaOU/pOMZr2y3zMgcl0+1HK3h9orXtnap4jEpjs/MfiPPGC2zwBLqpt/fFvKZxRa4UoeXWyMYfaNxEwJpI4rHStqQW7gFCveQUCv90Se5npu+6Nt04Z87uTdXp5s7NzGKhqxHui00EEenhsRQtXoOkMr9HGdoQPclU261NGNTII9Roh062LnpXc+uiD9Cuu04LRSoF+nlb7P6OSMCp+Qlx+b12LPZa+G9DXW9IpgexnbQkVkoyLgsd6oOO464UkTvRwp8k4tOIaQXWoj+lkF8indkX+M8z8Q+E6NNEfIoIP57r6Rhz7zvhHcoZ7EIZ/0tE+wL8dm8l4is2UuG+logBT/itW7eij4UP0DbUcqFQO5FJTncbG3ZFdNAwGNyJaPMHWKy7HMtaBPwHgHCoZVtPJVB/uCfFqNSZSGWWov3dBJhWc/NezZTJ+Mq7SSmj3kxmpdszqMcTeMflxN6x6F2Q9h/Ccoa4stAiOQ7LgoVOvGF5MtX+NsSFGcdxaCevjUT+1+sTzL/YMJJ8RxiyMgJmPikQt8whC2OGqG848UEhfg/a6Eu9YBoBnHE5/c4yrsRjJerNLnuBiVQyIP/HQq8bIGuW7/ftIeID4T4Y4JucxYIB6nsr7eZ5bTuhQbTz6f6vRr4Gj0f7e5Z6ohbcZeM1YDrzc7ehMUfsPiSW7EYrVgyVESodnExnPoS8lyJ4H8AAEx+Zz3a8GyLbg+teef5l13a+yUQYcHTMrHlrdwPOuMzsNMRBlluQuNwGaNjr891dX0WYA6gw2ikskcsQOMpIWS7O93Tci7Aow83pzEkY1E8CYRfCA2YEjOXyuOPsONOePpPEO6BziBtvPBZxkcYi1jyC8TMg+YHJlIM4kc6cIWwd3EixA3I9S+9dv3ppl03yOWDkAM3sfZ04McaKfAjleFIn2kEvVGG834kybeRr8/v6KiRPr+1TmZ8lUxmdzVeMJclqvgDWNInWzLeQZr3am5AYbTCqz9gizyGt3xdHiOXCpnjfwr7urm/0ren6a2+2ayn60OlMfLtOMrpMAH6NYdvtQuAAwDegm/uS7wna/c6sDNruID+Mme7a0LM0q/0K7uuE+OZ8T5feSuWjjNu2xp2yjoTgnq9UoklPfEZsY2UYkWXJoQhjQNEwPTUz3h96vlwHC6QMVcSUBygIcmM+2/UjJBaAZ4oib/u9aMAOENPT/iKywxFbj6V6OFUPHVAfBe4PER4H5Fyx3pnLdtwPN5LiCeMWGmx4GuGcHXeleiZFcF2GXVcgOVD5c16kWhGzWfUwyB6+KtNfey7/Vw0OfwNoofgIZ4i454qQvq/fzmtdcQ/p6+n44tq1y1etWvXsQL6n9Q4ivpuYTmoZQ5qg2t8As9vjBydb2z9gCe2ezzZ+Mpt9foMfPuTQv+DuA8DIQbN3XJeGY9ymKHXyFchglFkSPWoND57nK+x0YCfTbReg7V8AnvYtff9dxGIsExFSa7ilddGeYAxPIE0HBpnO0IMxi77mbyVWJ0lhiQYmcjs67fWI0/4Ci/6JPn8AGP3Vo3XRYA+E2LkD7XH5hp5pevGLFxh8iMvap2eMhvGDvdnUslH/qIvFOgI+HzcHRnm3tp8jpPV5SWLOlxAvgAkbJd6EM6k/A843DvFwED/5uj1ahES/TisH480eCCGyF99XFKUO9zzFxzNVBPG4O0TeF8G1319EKT2Frlyffb7csUuhnqWdHA2IAUNKE5eET4Vk8oQXGXjE7MJ8eLWj9wP/H3BvtmlJtbWjMx1fkVDomnWrloZ+46+MER1X98K1bl4y0OyWNWN87uu9D3tLOA8fD7145LD+nmVV0tbjBRFRqSwj8ekLgBdqgKMdOBi30aGYN+sldBnB8mEe3nhp1KAqJWxx3OFUyT0ua5jpP9Gu7/QTY5CuxuD6RG9JrG4Bo0u2Dn4f7XcVcMr0gpuY5WW1g1CaTO5x2dUlmy8NkBB/b113Z2cQ13crgxiiwi1oE2UmfvCLWF69u6+74xk/oNrGNubKvp7O74bSaMGCRiY+IZBGxKVvE9WekPTGjMhho7jKTGYsd4u3Ue0tTGf2v7JMmfMoygRcFUScQD6hSYUoUxnBK4OzjBc3RC1ErAOPSr8cuLn35VrJX7ZmpfZsJaaLygFE+hHLeT5Big2eeYiJlJv63N1Hf0bi7s99T9DWc/LoQDcizKOHEN8YIcYzu7YqFZWD/zEuEirtIJ+xDAtZ0HNQeSYUog6HY/dSxK+/VopYBonosQh0TxyHyAvR1mN4iuYxvb7SxSMaEASbWWf6JteSHYLhFW6mCgYCGnczD6/xln5C1wrT13pLA5UCvwbLaoW3BTBh44npTGcFM3KFLsBS0NPea/u7DdMeIaajgzgltzfbltxq2c2pzMfCJhO822pySaVVNI2iBmFxfCONQJxXZlUOVwZxuC6vyiElhzKUZKr99mQqIx60ZpZpudX6k5bB6bsiyVsBvinvVPgBZXuosJiIAaQ/UWaSbN34PhK+HHBaVDvTOH/eoBhn2jGTKbdjcSuZhEgNlxV2VZ8Q1JI/0Tt90Gv06gJsKXwADdjuhwvxf/eu7vyt+pNQCKHB7yTiL/NQQws6rRdOpR9m3mt9ZlIK8iydpS3L1UafpwGCAeuS/WW4BVBhdE2LfFRk1Vn5grFmcqpIOepJpnZfgDxOHg2BawwJR+uHGatCioDfW38iZY1pwUzKQlr/ABOKZHoV6W3hUEWsivggRsXtyqBvVxM1DYjLF5PQj6M6JrjTIhTSBFBTlj7Us7kQs+QkpClr85nkgURDn3c3gjL6QqHwIBG/kYjWAKqMzrZF0V2ZSTKVeUiIbkB/WluFSMJ8vc94quMgpZxCqmCm8k/7wrFhDAIYPEQOJjVBGvjUML0Miese6uyskKhRpjK2QJvJ13tDmG4xC34fbFQdT5Jn9YlJ4TbAFyImNw9lvI8txiTcjSNoTA52rAGy3T9UV9QWUtF9uh+OAfQ/tHJljd4iZBZ50WLn65oukW77lIqgUBYdAQXRLyXhMIs0alwJnrKHh0KliNKxVV90g17T+nzYksQbKBZ7IqwwHRc1KErlRVrCtpa1o4+AjtrhcuwXvr/a7htKHiLEmsaPqp4R/XDPLikggxegRuo69J1owYIgnbw8qh9YnGNXh/aoDOdnNjgDui5+rX/zUWW8+pbEmLm8NESv9qQPjdlcmI2tYmj+Tw2ky5HLn9dlaSLdvg9b8jA682P2yPAcOxbbG3hBfRgkToH+5vFCsjiZPIal4p357PSWuEu6NRs8zbjCtvj7SF9jMEm8iZi+EogAD+RTo/pCy7zMgejPegmMn0QZyiXVg18nVKlYPlCkpNi0wxtUj1VuX/SNVXj3m9H/7853z7gOBQlgUg3oOqn5+ZmxTaxr7gY/AC/RSfE49ASjISGuv8cLzm9Cwsm23A8hHIwHTzVCX811z3wl0dp+GQsn8tnOS7XDeFEbHQwqfrO6FdBQoVy5BbMuJBltRPRfxaRfx8X9heeqeqjUp8k7KQAAEABJREFUwEPxY/LTB1LoFKEMpypJjVcZHQudURHBdEsYU1IcHcToAJiJyK8fgkdnRHgqjOYPzApxnCJ0Hc3YCh62aF1ycEafS64qAgcdpu6KDEsey3F10M0uedUCnxTodvg8y6IrlTYaWA3VR4axNHi6f9Vf/lWNV4/fceU44O0K8AwT35Rb0/kcJojDMCH8GP6zctnOz6zDdm1h2FkEpODS6b7emcNPJ7FzReRe5VjW+3zdQMESXUap9IEkRHix68N0QyrRkSVfBFIzoGTkjnxPoyq2S/5RS/Gl8pYoTPR0BfrO06NYRZcMum+h0eWD1uHmDdipoJBfbCS2UMhjbF4sE72PhP5oDQ+dH6rr8LAm9tgiTMITqZl17V6uHRP/Pv+PF3rLASEONPYD//rXX1ZVR2nnrxpczxSEfpJMD36ZLXcQDEJneEfT6YzDTJeruwSRUoTTMO29wEED4QkDZjKmMjCXey4XJuUgaV3Grjr8gkQrYpaldwbAWWuGmJSGh1DgJ+QCv1aZpSg1jJRoWYGsH2tcEJT5gDnqEkb1NgBWiW9dzLZXB/GK7kppwAsT+ou4dKgQP+Ev97zwqodUHhnW2EfwEMBmGW3TKiliBVku1vltx7DwdezS4bnyLhTqa9FHUQAD1AwA96pk37TDSfi0gstHjC4NFscd4fOA5A/8ZY5r6VkSBFWavpGmI4VGpSIh6JEoHqmorZJQNbNnnLiL5bA6g1BT31dYnJ8FMYJu1yLts6PLQqG7rZGNp/ZGLE2Cacfr3iJMwrVJJQh0PvJ/kO4klONiFhsEEmhOww7J90puWL5ZEouxDgwqSxFgJjfFbDmRhJogYn2dCK4iOhcc0UYvzzgo+KYwAibmz5/NxGcXk3nPZY7YkcpAD6PqobMFRNC9EMyAsc2CBdXaawIz+17YrKUZhShpNTiyjjrwUYmPKZIPyD9Ud7FBRHUEr/fxSvaf18X7atbnydeu3UlEdPmnbVREZZpOTHtRpHKPSHUEaJXTafT3CrPzxKi3flfBdY8E9q6AooF0JI4FSZEvh1RwpEoUxQii5LxuSAWia3YviImvJbF2Rn0/XnDlxA1rOsvSUnNq43tBoxM9RH0w3xk2gzc3L2hGPufS6A9jlS+JkgD9D6uAzgA1wmJd2R+y45BM/et16L5LFEkBffsn+ezylequhtJBRN3S9aKY+GeNHDupdxMMIjG/fXbLDhmU4yXb7McWYRL9q+b9jYh/SaO/p63hoRqlpUY7lq1rx14ooX6RbFj/nIYFIblDVo+e6kD0gjHof4MZaj4JH2INb7yQqHg9l0Ym5y3cG/mcpu4SLPNPoZX8ZUsKCXS80SUJEz0c1kHKCUIcOlu4Np9DVMfx8ZUrh9AZvoNsvMHGRKtdh7EdhpAQA6njZOC0IaoA8Aw60KOoI8R8z1vxGLLlEBIq04mIInUXM8hdL0yV27fMv6aVtbogHnFPgIJH9RaoDvm/1xHz7VHKPSAxWXQmXnQelX6oe2TnL6GEWtVSJPLsAPQTy1fwDieNSgWafEmMXFvPn+jukwaswOh8noXOgsR5WpBBeAOZBJIAaqqYRJG6CGmcrn1KD9cVMYnu0U+5fU+1bY1YujQO4j/NIwOPVuOpX9jR5Wda3YCIiRIxMCOWtR8sXUrB8syt2cCZFC8k7FGQ48SligkkDC0qbIswiRruyPRgFLezCo4OgkHXtW72dQqjlV0cpwJfCf80gBphS6C5xp68JZ+qzLOmgxA6UcTabgkU5YTOJLZmChChcEkHcaFm/vz5mE2dk8mhHxCFi//BhMCHJEHY46fiYBO5F4MMzDSIVXTrLIxBdRYTq+5jfTGUBO/zE7gxRvCsNsIfQRADfBO5S7R27fL1kAKCO0g5S9waEXc2lIWuS29jYsfPVG1UYKxDaZRIZfZlEh1Yiq4wZudXhCiIkatnXUalSKLfMbZb0bgXV6/va6+Tl8eUQbhM5+ZWd/09WAaPWCq2lwcy8oyQ6tAHhT8WSDugy5fg5BSIo+b0wgVo4fODYehboTqxpqaFr0H9dGlURGd6LGyiLEbiydYpePpLjb/bhZHizgYCo4wyWbQ1lmVydxTOpsK3CJMQcfRwlM8dB4Td0G8RUDm2LOtE2DuC8P66EF7PcCK94WIQXM/BewF4oO/xwcJ8WnWjl5RkHwSObyLXdk07dmvnCB4OWmXH4sv8hPXYfdh1ULzEtHxQM65BoaD4MrpLkUOnvAWIAqgy6JQsn0NEHp3rBUR6dGGiLtd2aiQtxFNz84JmNGRZ4036E7o/TDLQKACy5rs8Gw+iUGUou46cbjH/AXVZTMHfGFu2LVAGo67/BXR/NoeT7uvvmVmzs6URY4HmRUwn0ehvEM5jIUVcV7vVV7zHEfG61IVF64T4rSJ8XTUzmVV73mYt6Beqi0i0bnwbMhtd6hD/IL86/WeEhRl2xT4bETsDfPMKk/uU7wna1gz6APzlMyQicmftRAkMGL0EF422BE7PiNBjYfo7LzLwUCbLLMuiTm4GUCOdoE1kXHjEJkOXxNgi5f4+5jMNBWu57wnas9OZDF4cWmu5iom/mEi17Yd4xqw7PZnKXMjicc7gGQr0D7qyutGRhsA4KvaZMRNHiLeQIgrWmUijEgwszyyLF2hMpaqHVXrM1Q/SLDqXxP5WVKOWUD1L34dt0c7DXkD4oPSikq0DS8BAIHHwtQhQhSIszzyKnYEanYEX0zjt/UJUypv0NxC23awRPnjMjUl3clwS9/8SVUpD3olNksMhuellJbv76WA/ZY9sjGT6bvHUX5BhDWACgGJ5dFmIPOoyTpViGYmmY8n2Q+iharb6Svc4YgkJrKKBzkmeCNt9sGgE0hGVz9ugr9wVcbqSQdVPIzt/9h52xbmjmlaI94xueXKlBEUYzA+H6xgyYGaW7qz5YzBS36SZx2w+kQm1oeIP7ifhQrPjGWGUGYpFx5Ml34yqc0TSimC/ghWBE/G85jWrUiT05nIeHPVvQUti0CxjPU/P5ptGLieSy5j4ITAHt38kMQDqYraXqi1TfjhsT15FKjSGnmL0i40Ub1UkRTm6rmv0kcFgXqlrbVdKoLsOYG6DsxpyuhwohUZbKkWAJu8qYWhHuyGs0bxGZcYAYBWTdatMtx41GV5P7ldHNRTX1vZJwXAmWumyWyFeB+PV3TvcnECddlI3Mb+5BRKAupWWzanMjeDGNwnFPuG6jO1kQpYaS8JiXd0boShrTrUfQcLBcwRIyNfmV2/+rUgeY638ylEr8Iwbk4trRf0aKQLdh35jhW0LLqhRIEf2lea5mb0skqCe5/eNYql0p3WpgBbQD7S6DIG6JIRVNJDEdHdJir7RZ3Kuo8rVtB8CRhWpb9JlH17oOOD6y+5BsViZN4IiDdtUOIWFl+ejJZ/IxMGISWcShZityrbXlQopWI6Efs2ZbFWFpBzGLn1Fv8rMZ7vuymc7k3HH0TMPMRHrNiIObv8NYGBetibke4UYO3sQUXC2+1NsZLjm3L1KAK4rl7ri6vqs/O6WSB7p6zLNWHNixJwN5C/XI0UQeZKVrjuRDKmIQuuGGAhgziVA2hEy64WY3pWReZ0IYZFLDQtKMhZS3Ub5BB965Mr+hmFfl4GsawzHWVSa2hlpdf18itvQmAODFuwkdSN9yo7F9rFpZAORvKecGpJHFGNsnte2E9rna8C1AL55xok5euANWfpB9dn9w00HklD5Gw2kGrYsOi90hwDSF+KDS80cWfTZMGaWHGzaAbh7A3wT0R6L42LRRah48Hua34X1P2TEoN+niNyVkAL/Cr9vQEtrqe/xbWUoZNkqRUCa8EJFmJS5oDiq/rEu+xD4F8BMgJqI7WqNKkLz3IwytxNsFkw6lVJiEaP+Z7BB6081BiYLq4iMfu0hrRoK+b5BOxQx34DZ6rrg9pWmWLt2eT/RYgtiriqL/HyIsZXVl+3U2VXRKkF4FwQwwDePhnWQEaaPC/FGZld3FcqiO8KC62c/jxAbHUf4EoZ0FFmXqlTFrx7loEBwaN1UvGeSM1joitzMgS5m0pnDTxa61PAYFkMZasmdQCwvn4R5La2s3akAjmd0xseAvgSe/5Pr6bwOzHl3h2KpgljpfHZ6A/zH6GfxyCe4hHPJlWvCGKMecxaXlPEG9Tw54fF+aKR6GVbFZ7l/SuAIPuodNCAZK63KuIi8GkvS0N00y3WUSeipRaB5JrQ9Eq2DkExF9UFladYiVhHfSxR8JFvb3kEkH3AofqlL/Ho/Du+/Iu4MQ9HuhxRtiTeeikpjt8s7KoC+TZGTQAJKYLTVO5hJpVZ/2eNsHBpxirnVPlsg1YDBXY3xdWfEMqo20Rgh1hhx44tiWkCjv5dmMmPQjwaAAcTRoT6HkFesoSGslTBfwBM0Ta0bdLkSXF+usGy+FTgCqDUWa2OWw9E4Fd9taEQindkX4afEmC5pcG1tuJc03AMWpF/iN4AXFPLgZHrgHEIn4OFBnTGF6vg5rvfVY4uPymLVaKSLTFMgpsu3cj3Tb6j62EfQSUKWGsqwrItI6Me5aYPKPOtSvGpZyE/r/5g1vPEbqJe+h7M++3wPtlezviivyw4UjIECDBgwsP/XVLpgFd6yUYVaYaTwfSLWNqPSzyXhUzFQtV6loPqtEP3CCqzJr0EOWldYo6Zphze8xmLadzSEsCRxx+or2hZ+WyM/qTkbo30Fg/ISm/lcYfaZ74BrOTUH/WbNW9RGzFcA7wylYaAeBEbwD0x6FRIdZvg3CdMpbPEPfVxU4jnom2pOorZgsDPxlwBfYeHypOani7DZaZj+BcRx1PhC3GaZSWcSLnMyugaL48nUwM1EvIQtOSVstieCYrHyinAw6ejPqKn2NwBJoScYrAMDa77b0HEvA2ftUJERDXV3GQc6FE+XUg6ocWCnJXMGCR2Pek/odBuzjARz144gLkMZRv+wSmtoh1m12GBcHubygtjV6+ASw5LXezoalRr0nIOHTuicMoew9qaqn9IBZT2M4JclzseE0x+xMHbl6dBhtvjqailCJRnsJf8UAyooKbmg7Vn5no57kc04zJIY1vYQ3ckXxcdsf7sQ3xGDTL8t0bJUZxJ6aEkjQ2A9i6UTRjlKaRTsK3C/XIpssAoWFKclHyxlELbr3kPCKrnUMERhVgaD6gEZxmtri64moRuw5FVlvh/XgWjfDaeaxXEsYa4idh/JZTt+WmJQAxoDmGXF7WbY1Qb9ou18MPR3o59GjK/qJJv2W5tG2TwMJgrqAvYZicneOvBbUgv3SLYOPkJ6rZZLx1RvYVLpV31iDpQb8zNqL5m4OjsD1fNVPPTMAQbGfSz8nWDHdSX2IyToKCHvVIjFdCsW1S+FlKzZs3dNJNPtN6OznCau9cGoepfQa6zYsKsn/ModUYTjPpKehENHgGJLknYs5p2c047EQv/p46DcGoWWLk3Q0cCw6HRleIprkzwA25tt8BJvSmyYGfz8nrRDg4ANGjoAAAuxSURBVA6/xIh7CQzi6L6XO0IvPkEe5NWB+Gx1l+C+0b+M80K4KbXocBHrz0QclCD6XLKOhASBiQA1pM3/NbXq9rTo1qCf+Bk37oZuTyqC2E4Mtg0gYvrFrE0ok0VID5H50u0GYct3e2ccXOHvMnN5ixWDWek6TEQx1yJV4qKsxfFEa+Z4MIjHSfgy9CvvS1TgENrLZyrq1rqxhrdAKnDjjbcr/fM90++IFRy9hUrrAp0k7QYcDw82pVJ7zmxODWLHSSx/J6e0Q+gvoWZb4r6dKn92Mt12PupzDlnWCZvbTyuzqvRZld5J8LEDRkA+x5uBjvmrZKpnBJ3neWKKM7sHV+shAqUyO6yfUc8ohwlFXhTj4zS4/CQJPVjyzyDXOjrZumiXRLr9DHDUx9Fw1+Z6Oq9FvAA8o6Kha3kn43wx/cvJVPutLam2RTPmtM1rTi9akki1f92JN6xCK86RuPUffeO4dRh72dgnF1XeeeW65J7dklq4RyLV9hEekaeJpRd5v1t1AIpQiDdkYL8JoEakUqHFzenMScTuRWzR+4IdQSUkzCB6PgGkoHl47+80t7a/MTG3bTeUdS069LPI7NtN8f6jxmIQWmjpL+qDIvx+za1DR6juIZnOfCiZyjxlkavboAnFVxChOwsu7d6fXaqDSjRs86FGity0ZOCKMjtv+1rGOGfg1yXX04hJTHxRP83knuz3FRHrcUv4q7nuzm8DXwBUPN8h6iciugjvXkimBoeZCW3Kx+Z7OsoMgvBjl1RCzcGp5tCm1KLDWuZlDnKnNT5GFv09n51xhi7pvH4hdKMiIa9jmlvbTlD6JtAvNlLhOWHK+riKo5MBwlTZ6eWNieSqZKr9NC/N3Pb3JFOZ35PwURhf++dXL93sMylaRhRMOpPQ7S68zNEkpOKUVy6o3YF18LFQih2it/N4gSGPllTVjU1MD9rRe/LlHJSATQ19H0Q5nwHouvEiDKQ/g5B72bHYfrmervJx6HIiOPRIb1O8b28h1i9WnwaX/xgUTy/EbV6FGeR7TNLoMO+bz3Z+eFMDC9lFmly263oM2kOYSE8LHuCSpZfZnoURcFa+u+uYQN5sF+viidrA7/IPUM0uSTQYjMcXXD4iV3WCUAv3y4H7ScD+yP85tvi3xFjjOLKLXltXvWQAXoXxth4rz3T8kMhegrz2dgoFzJz0IyTA9jS5sF8glgtHHNmhr6fz5OCxZ8RtttHtabRBWYoAc/9GrmeaMqPIvPLZ5S8J8QVC1BGLxX8biViOeHakKd5/FurtDTj0y0uJXQwq2RnvsX8uW3ldoQ7oRoqfI8TXIwt95xEivt2Oxd6Uz3b8kqp+mAD/hD5zANpJv2ZuVmbqunQ1muDsfHfn+ZqfnyTX06mM5nQhygnzt0Hfv1vEZ6KvnFKNq2kgoT2teWNs/Rp+bOHLrUjzop7BQft8IZ/tPGis8YU04zLWuFKNnUjwMj/P93QuRKVZoS/buagv24XONvaBGhma9jLwZwO8dCDUe3sj9uSrq6Cdvy/beSNgx1L6WWjE0/wZuhrf9xfTdXwfad4CsAFe2aV8PrG+u6MTuGhHPMdvBIP617ls54HI3y9j/77uLj0KXdZSVzNJFPqTGU7jYHOq7Swn3oB6uC+B0R46xmD0ykEZ+wO894Ctn7afN7C2a3U91e8fbjoQnbC89Sjk3pfPvvBiPttxKfLaFeDnq++xZ7676+p6895U+Q1u7I/IvxHglZHr6cI27dh9RvPsy3Z8H+21aFNtrbgK2uao91dRTgtAy2rp6+6MpJGeoUEZZwNX3xm7Px1j9ivtM2CaBwNf81bYX9sfZaNJ8Rw1Duh6G+ru91k7hz4Sgeul0rwxtg5B3loXzbsh3935nr6qvuQhT9JjSzCJcVctl3tORalqQo47v20sITtk6aUqZYUUEx0F0bPXFd4LM9d++W69SXvTg4bG/avZehzzFOC4i4lIqIMRUa/W9serb51mq2ISWyeJtnytdLsxkcp8GsubTwZKc0X4cdu2sEzoPLneWZIm8KveemYuXtM+gSwnkNQk3VooYJjEv6El5s7NzEqm2t4BZdMtgGyM3W5IDbrm9XQRqNKLzO4u+Z6OM6LumwDOJJsapWHkp+aTXLDJbiungGESU9BA+n1FS0r/6rDtTmUKwxZh240fRtEfB8wEg6jQF4jQ5VtCAYWyIk311jMxPTqRLwcjCzIR2xwFDJPYMk1mJ1KZt4AhqKTQaxWstS7J/cz8URSnJ/4eJZJT446zoxtzd8IivLy3TsQPTxPSc/w0db8lMaq8rAW7voKtvImd+Z+6+puStiQFDJOYROrq+YpEOnMNmMNaSAe6DamSAhSR8gcW+iyJpbsD06GZfkc+23XH2rXLV1kj1odQBd1ShEWRH7Fp5JaC5LzuN4JpHRvIf0oVloFyjXMrpIBhEpPQKN6BltbMt/R8BQudiyzBGOgRMIqj8tMHwBS69sn1dF6T71n6N8SVtzzBUPaFWP8VhHmGia/FdtjTnmfKHrVSBLNRWE4Z+beBggyTmFgjcSLV9hGnUFiOgXUSslpDLBdiCTEnn+18J/a876OV4V9jqp4CDEX/JUoZCmHJ0VEg+0bkASeeU2RKuoigFGEUllNE+22lGMMkxt1Si+PJdOarmP1/gCziyhya4n075bu7ru4PuRUZOAGzOG4VvMtZ/GWGyyLnrM+G/09pIOEkOz0p4rPIdAbAN09E/YOaj2DsVxcFDJMYV3srgxi8AdP/eUj+omNZb1TmoCf54N+EQdril7B6X0IRl+XifE+XfvNS9E/Rs/oYtBYrJP8TJf1ovIFXHwUMkxhHmydbB08Bg/gEkv6VLXmbfgMCdz2GS3dSjDIIokcn67v/eirg4+g3GlL1D1OIMwpLEMGYSgoYJlFJj036kqndXw9l46VAxE4EnZAL+dAKcWGGm1sz55LwVYFIZTKT9t1/IN9NOvuGav5jlKBXCf0zn01mZhC2awoYJrGZzStsH4YkO0IXsTk7ER6DEKavIa1v1pJlHbcZTMZPN2G7pWXnJHQoen0dBzIbEPY+/w4EGaehANF2ziQmu4mXxJhoCRHlmNy7iKiOnYjF8eZ05vIqBpGD/7D86sn97h/1qcu48cZjITUcVIX8s/zqmc9XhRmvoYBhEpvTB+bO7WkEW5iDNHXtAKRSe85MtA7eqseskcY3KkG8s6874lJfH2sL2XrlHDGdX5X9ALjdNcG7DqrijfdVTAEjSWxG41tWDGOJCsK8dlM7AE1zFr5hIxV+ixlbz0+USpE/MLv7/LskCO8SYmFdZgT/YQorD/r81B/iKpHEWFs9BQyT2Iwm8u47YH6YSfbQw1BhSXXXIJluu8CyLf2/hb3KONBHNMX7D57qD7fK5ZccBbEvs1B/Yv6Qgri8W66nE1IEZKQSjrEMBYIUmEQmEcx2+3VbQ4O3YDitswrWDXPm7L4D3hRqisXxxNy23ZKp9iv6RxLdJN4ORhxxap50mNvz3Z3n13eOQpNsKXh2RK/N7812Lc13d9ytMJ57O7dU7Uy+WycFDJPYzHbR6/QaKXYkdJb/HLHtjmQq43oXo1r8F4R9Dtnp5bB6pf83PeaQ7XyrXjmGcGMMBbZJChgmMY5m02VHPtt1UT7b2dLgUtOIIzsoFEb/ASuFuMm6H3McNTRJDAUmjwKGSUyQlnpTt14Eq6CivNkhmCBBTfLJosCk5WOYxKSR0mRkKLB9UsAwie2zXc1bGQpMGgUMk5g0UpqMDAW2TwoYJrF9tqt5q6mlwHZdmmES23XzmpczFJg4BQyTmDgNTQ6GAts1BQyT2K6b17ycocDEKWCYxMRpaHKYWgqY0qaYAoZJTDHBTXGGAtsaBQyT2NZazNTXUGCKKWCYxBQT3BRnKLCtUcAwiW2txaa2vqY0QwEyTMJ0AkMBQ4ExKWCYxJjkMZGGAoYChkmYPmAoYCgwJgUMkxiTPFMaaQozFNgqKWCYxFbZLKZShgJbDwX+PwAAAP//MGXIpQAAAAZJREFUAwD0HGzM8cAaugAAAABJRU5ErkJggg==', 'font-signature-1', 1, 'Active', 11, '2026-09-17 14:29:43', '2026-09-21 16:35:39');

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
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `name` varchar(120) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `last_status` int(11) DEFAULT NULL,
  `last_delivery_at` datetime DEFAULT NULL,
  `failure_count` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `webhook_deliveries`
--

CREATE TABLE `webhook_deliveries` (
  `id` int(11) NOT NULL,
  `webhook_id` int(11) NOT NULL,
  `event` varchar(80) NOT NULL,
  `payload` longtext DEFAULT NULL,
  `status_code` int(11) DEFAULT NULL,
  `response_body` text DEFAULT NULL,
  `success` tinyint(1) DEFAULT 0,
  `duration_ms` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `delivery_id` varchar(40) DEFAULT NULL,
  `attempt` int(11) NOT NULL DEFAULT 1,
  `error` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `activity_history`
--
ALTER TABLE `activity_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `document_id` (`document_id`),
  ADD KEY `idx_activity_history_time` (`created_at`);

--
-- Indexes for table `activity_logs`
--
ALTER TABLE `activity_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_activity_logs_time` (`created_at`);

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
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_api_logs_time` (`created_at`);

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
-- Indexes for table `developer_settings`
--
ALTER TABLE `developer_settings`
  ADD PRIMARY KEY (`id`);

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
-- Indexes for table `document_signing_flow`
--
ALTER TABLE `document_signing_flow`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_signing_flow_document` (`document_id`);

--
-- Indexes for table `document_validity`
--
ALTER TABLE `document_validity`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `certificate_id` (`certificate_id`),
  ADD KEY `document_id` (`document_id`),
  ADD KEY `idx_document_validity_time` (`checked_at`),
  ADD KEY `idx_document_validity_sha256` (`sha256`);

--
-- Indexes for table `document_verification`
--
ALTER TABLE `document_verification`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_document_verification_document` (`document_id`),
  ADD KEY `idx_document_verification_status` (`status`);

--
-- Indexes for table `document_verification_events`
--
ALTER TABLE `document_verification_events`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_verification_events_document` (`document_id`,`id`);

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
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_failed_access_time` (`attempt_time`),
  ADD KEY `idx_failed_access_ip` (`ip_address`);

--
-- Indexes for table `general_settings`
--
ALTER TABLE `general_settings`
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
  ADD KEY `user_id` (`user_id`),
  ADD KEY `idx_notifications_user_read` (`user_id`,`is_read`,`created_at`);

--
-- Indexes for table `notification_preferences`
--
ALTER TABLE `notification_preferences`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`);

--
-- Indexes for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_token_hash` (`token_hash`),
  ADD KEY `idx_reset_user` (`user_id`);

--
-- Indexes for table `permissions`
--
ALTER TABLE `permissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_permission_key` (`permission_key`);

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
-- Indexes for table `report_runs`
--
ALTER TABLE `report_runs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_report_runs_schedule` (`scheduled_report_id`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `role_key` (`role_key`);

--
-- Indexes for table `role_permissions`
--
ALTER TABLE `role_permissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_role_permission` (`role_key`,`permission_key`),
  ADD KEY `idx_role_permissions_role` (`role_key`);

--
-- Indexes for table `scheduled_reports`
--
ALTER TABLE `scheduled_reports`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `self_sign_documents`
--
ALTER TABLE `self_sign_documents`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_self_sign_document` (`document_id`),
  ADD KEY `idx_self_sign_user_stage` (`user_id`,`stage`);

--
-- Indexes for table `self_sign_events`
--
ALTER TABLE `self_sign_events`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_self_sign_events_doc` (`self_sign_id`,`created_at`);

--
-- Indexes for table `self_sign_shares`
--
ALTER TABLE `self_sign_shares`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_self_sign_shares_doc` (`self_sign_id`);

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
-- Indexes for table `signature_usage_log`
--
ALTER TABLE `signature_usage_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_usage_signature` (`signature_id`,`used_at`),
  ADD KEY `idx_usage_document` (`document_id`);

--
-- Indexes for table `signing_email_dispatch`
--
ALTER TABLE `signing_email_dispatch`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_dispatch_document` (`document_id`,`step_index`),
  ADD KEY `idx_dispatch_status` (`status`),
  ADD KEY `idx_dispatch_created` (`created_at`);

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
  ADD KEY `user_id` (`user_id`),
  ADD KEY `idx_user_login_logs_time` (`login_at`);

--
-- Indexes for table `user_permissions`
--
ALTER TABLE `user_permissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_user_permission` (`user_id`,`permission_key`),
  ADD KEY `idx_user_permissions_user` (`user_id`);

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
-- Indexes for table `user_signatures`
--
ALTER TABLE `user_signatures`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_user_signature_id` (`signature_id`),
  ADD UNIQUE KEY `uniq_user_signature_legacy` (`legacy_employee_id`),
  ADD KEY `idx_user_signature_owner` (`owner_user_id`),
  ADD KEY `idx_user_signature_email` (`owner_email`);

--
-- Indexes for table `webhooks`
--
ALTER TABLE `webhooks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `webhook_deliveries`
--
ALTER TABLE `webhook_deliveries`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_webhook_deliveries_webhook` (`webhook_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `activity_history`
--
ALTER TABLE `activity_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=456;

--
-- AUTO_INCREMENT for table `activity_logs`
--
ALTER TABLE `activity_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=86;

--
-- AUTO_INCREMENT for table `announcements`
--
ALTER TABLE `announcements`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `api_keys`
--
ALTER TABLE `api_keys`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `api_logs`
--
ALTER TABLE `api_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

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
-- AUTO_INCREMENT for table `developer_settings`
--
ALTER TABLE `developer_settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `documents`
--
ALTER TABLE `documents`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=103;

--
-- AUTO_INCREMENT for table `document_fields`
--
ALTER TABLE `document_fields`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=793;

--
-- AUTO_INCREMENT for table `document_field_values`
--
ALTER TABLE `document_field_values`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=134;

--
-- AUTO_INCREMENT for table `document_files`
--
ALTER TABLE `document_files`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=122;

--
-- AUTO_INCREMENT for table `document_identifiers`
--
ALTER TABLE `document_identifiers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=102;

--
-- AUTO_INCREMENT for table `document_recipients`
--
ALTER TABLE `document_recipients`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=156;

--
-- AUTO_INCREMENT for table `document_signing_flow`
--
ALTER TABLE `document_signing_flow`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=100;

--
-- AUTO_INCREMENT for table `document_validity`
--
ALTER TABLE `document_validity`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=41;

--
-- AUTO_INCREMENT for table `document_verification`
--
ALTER TABLE `document_verification`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31;

--
-- AUTO_INCREMENT for table `document_verification_events`
--
ALTER TABLE `document_verification_events`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT for table `document_versions`
--
ALTER TABLE `document_versions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;

--
-- AUTO_INCREMENT for table `failed_access_logs`
--
ALTER TABLE `failed_access_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT for table `general_settings`
--
ALTER TABLE `general_settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `integrations`
--
ALTER TABLE `integrations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `issued_pdf_fingerprints`
--
ALTER TABLE `issued_pdf_fingerprints`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=96;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=60;

--
-- AUTO_INCREMENT for table `notification_preferences`
--
ALTER TABLE `notification_preferences`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `permissions`
--
ALTER TABLE `permissions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1222;

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
-- AUTO_INCREMENT for table `report_runs`
--
ALTER TABLE `report_runs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `role_permissions`
--
ALTER TABLE `role_permissions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3699;

--
-- AUTO_INCREMENT for table `scheduled_reports`
--
ALTER TABLE `scheduled_reports`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `self_sign_documents`
--
ALTER TABLE `self_sign_documents`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `self_sign_events`
--
ALTER TABLE `self_sign_events`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=46;

--
-- AUTO_INCREMENT for table `self_sign_shares`
--
ALTER TABLE `self_sign_shares`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `signatures`
--
ALTER TABLE `signatures`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `signature_events`
--
ALTER TABLE `signature_events`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=217;

--
-- AUTO_INCREMENT for table `signature_requests`
--
ALTER TABLE `signature_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `signature_usage_log`
--
ALTER TABLE `signature_usage_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT for table `signing_email_dispatch`
--
ALTER TABLE `signing_email_dispatch`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=40;

--
-- AUTO_INCREMENT for table `templates`
--
ALTER TABLE `templates`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `user_login_logs`
--
ALTER TABLE `user_login_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `user_permissions`
--
ALTER TABLE `user_permissions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

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
-- AUTO_INCREMENT for table `user_signatures`
--
ALTER TABLE `user_signatures`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `webhooks`
--
ALTER TABLE `webhooks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `webhook_deliveries`
--
ALTER TABLE `webhook_deliveries`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

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
