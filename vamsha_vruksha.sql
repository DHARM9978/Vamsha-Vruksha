-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Feb 08, 2026 at 08:27 PM
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
-- Database: `vamsha_vruksha`
--

-- --------------------------------------------------------

--
-- Table structure for table `family`
--

CREATE TABLE `family` (
  `Family_Id` int(11) NOT NULL,
  `Family_Name` varchar(255) NOT NULL,
  `Native_Place` varchar(255) DEFAULT NULL,
  `Head_DOB` date DEFAULT NULL,
  `Gotra_Id` int(11) DEFAULT NULL,
  `Created_At` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `family`
--

INSERT INTO `family` (`Family_Id`, `Family_Name`, `Native_Place`, `Head_DOB`, `Gotra_Id`, `Created_At`) VALUES
(3, 'Kantibhai', 'shahpur', '1999-01-01', 4, '2026-01-09 15:10:42'),
(4, 'Khijamjibhai donda', 'nari', '1999-01-01', 3, '2026-01-09 15:18:12'),
(5, 'Vallabhbhai Ghasadiya', 'Shahpur', '1999-01-01', 3, '2026-01-09 23:41:10'),
(7, 'Kamleshbhai Kakadiya', 'patana', '1999-01-01', 4, '2026-01-10 10:35:53'),
(8, 'Demo Family', 'demo', '2000-01-09', 4, '2026-02-09 00:42:44');

-- --------------------------------------------------------

--
-- Table structure for table `family_relation`
--

CREATE TABLE `family_relation` (
  `Relation_Id` int(11) NOT NULL,
  `Person_Id` int(11) DEFAULT NULL,
  `Related_Person_Id` int(11) DEFAULT NULL,
  `Relation_Type` varchar(50) DEFAULT NULL,
  `Created_At` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `family_relation`
--

INSERT INTO `family_relation` (`Relation_Id`, `Person_Id`, `Related_Person_Id`, `Relation_Type`, `Created_At`) VALUES
(3, 3, 2, 'Wife-Husband', '2026-01-09 15:11:43'),
(4, 4, 2, 'Father', '2026-01-09 15:14:11'),
(7, 7, 6, 'Father', '2026-01-09 15:19:01'),
(10, 9, 2, 'Father', '2026-01-09 18:38:08'),
(11, 9, 7, 'Wife-Husband', '2026-01-09 18:38:08'),
(12, 10, 2, 'Father', '2026-01-09 23:09:40'),
(13, 11, 4, 'Father', '2026-01-09 23:20:32'),
(14, 12, 4, 'Father', '2026-01-09 23:22:28'),
(15, 13, 10, 'Father', '2026-01-09 23:23:23'),
(16, 14, 10, 'Father', '2026-01-09 23:24:10'),
(17, 15, 6, 'Father', '2026-01-09 23:30:24'),
(19, 17, 16, 'Wife-Husband', '2026-01-10 10:30:41'),
(25, 22, 16, 'Father', '2026-01-10 10:51:42'),
(26, 22, 4, 'Wife-Husband', '2026-01-10 10:51:42'),
(27, 23, 19, 'Daughter', '2026-01-10 10:55:53'),
(29, 24, 19, 'Wife-Husband', '2026-01-10 10:57:44'),
(30, 24, 19, 'Wife-Husband', '2026-01-10 10:57:44'),
(31, 25, 2, 'Father', '2026-01-10 22:30:29'),
(34, 27, 2, 'Mother', '2026-01-10 22:42:37'),
(41, 28, 6, 'Wife-Husband', '2026-01-14 15:49:46'),
(42, 6, 28, 'Husband-Wife', '2026-01-14 15:49:46'),
(43, 29, 16, 'Father', '2026-01-14 15:52:02'),
(44, 16, 29, 'Son', '2026-01-14 15:52:02'),
(45, 30, 16, 'Father', '2026-01-14 16:33:12'),
(46, 16, 30, 'Son', '2026-01-14 16:33:12'),
(51, 33, 29, 'Father', '2026-01-16 11:59:46'),
(52, 29, 33, 'Son', '2026-01-16 11:59:46'),
(53, 35, 12, 'Father', '2026-02-09 00:43:28'),
(54, 12, 35, 'Daughter', '2026-02-09 00:43:28'),
(55, 35, 34, 'Wife-Husband', '2026-02-09 00:43:28'),
(56, 34, 35, 'Husband-Wife', '2026-02-09 00:43:28');

-- --------------------------------------------------------

--
-- Table structure for table `gothra`
--

CREATE TABLE `gothra` (
  `Gotra_Id` int(11) NOT NULL,
  `Gotra_Name` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `gothra`
--

INSERT INTO `gothra` (`Gotra_Id`, `Gotra_Name`) VALUES
(3, 'Kashyapa'),
(4, 'Bharadwaja');

-- --------------------------------------------------------

--
-- Table structure for table `kula_devatha`
--

CREATE TABLE `kula_devatha` (
  `Kula_Devatha_Id` int(11) NOT NULL,
  `Kula_Devatha_Name` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `kula_devatha`
--

INSERT INTO `kula_devatha` (`Kula_Devatha_Id`, `Kula_Devatha_Name`) VALUES
(1, 'Durga'),
(2, 'Lakshmi');

-- --------------------------------------------------------

--
-- Table structure for table `mane_devru`
--

CREATE TABLE `mane_devru` (
  `Mane_Devru_Id` int(11) NOT NULL,
  `Mane_Devru_Name` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `mane_devru`
--

INSERT INTO `mane_devru` (`Mane_Devru_Id`, `Mane_Devru_Name`) VALUES
(1, 'Ganapati'),
(2, 'Shiva');

-- --------------------------------------------------------

--
-- Table structure for table `panchang_sudhi`
--

CREATE TABLE `panchang_sudhi` (
  `Panchang_Sudhi_Id` int(11) NOT NULL,
  `Panchang_Sudhi_Name` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `panchang_sudhi`
--

INSERT INTO `panchang_sudhi` (`Panchang_Sudhi_Id`, `Panchang_Sudhi_Name`) VALUES
(1, 'Shukla Paksha'),
(2, 'Krishna Paksha');

-- --------------------------------------------------------

--
-- Table structure for table `person`
--

CREATE TABLE `person` (
  `Person_Id` int(11) NOT NULL,
  `Family_Id` int(11) DEFAULT NULL,
  `First_Name` varchar(255) DEFAULT NULL,
  `Last_Name` varchar(255) DEFAULT NULL,
  `Gender` varchar(20) DEFAULT NULL,
  `DOB` date DEFAULT NULL,
  `Phone_Number` varchar(20) DEFAULT NULL,
  `Mobile_Number` varchar(20) DEFAULT NULL,
  `Email` varchar(255) DEFAULT NULL,
  `Original_Native` varchar(255) DEFAULT NULL,
  `Current_Address` varchar(255) DEFAULT NULL,
  `Gotra_Id` int(11) DEFAULT NULL,
  `Sutra_Id` int(11) DEFAULT NULL,
  `Panchang_Sudhi_Id` int(11) DEFAULT NULL,
  `Vamsha_Id` int(11) DEFAULT NULL,
  `Mane_Devru_Id` int(11) DEFAULT NULL,
  `Kula_Devatha_Id` int(11) DEFAULT NULL,
  `Pooja_Vruksha_Id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `person`
--

INSERT INTO `person` (`Person_Id`, `Family_Id`, `First_Name`, `Last_Name`, `Gender`, `DOB`, `Phone_Number`, `Mobile_Number`, `Email`, `Original_Native`, `Current_Address`, `Gotra_Id`, `Sutra_Id`, `Panchang_Sudhi_Id`, `Vamsha_Id`, `Mane_Devru_Id`, `Kula_Devatha_Id`, `Pooja_Vruksha_Id`) VALUES
(2, 3, 'Kantibhai', 'Bhadani', 'Male', '1999-01-01', '1212121212', '1212121212', 'kantibhai@gmail.com', 'shahpur', '0', 4, 1, 2, 2, 1, 1, 2),
(3, 3, 'ramaben', 'bhadani', 'Female', '1999-01-01', '1212121212', '1212121212', 'reamben@gmail.com', 'Navda', '0', 3, 2, 1, 1, 2, 2, 1),
(4, 3, 'Bhaveshbhai', 'Bhadani', 'Male', '2000-01-01', '1212121212', '1212121212', 'bhavesh@gmail.com', 'Shahpur', '0', 4, 1, 2, 2, 1, 1, 2),
(6, 4, 'Khimajibhai', 'donda', 'Male', '1999-01-01', '1212121212', '1212121212', 'khijamjibhai@gmail.com', 'nari', '0', 3, 2, 1, 1, 2, 2, 1),
(7, 4, 'Dineshbhai', 'Donda', 'Male', '2000-01-01', '1212121212', '1212121212', 'dinesh@gmail.com', 'Nari', '0', 3, 2, 1, 1, 2, 2, 1),
(9, 3, 'Mamataben', '', 'Female', '2000-01-01', NULL, NULL, NULL, 'Shahpur', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(10, 3, 'Hardikbhai', 'Bhadani', 'Male', '2000-01-01', '1212121212', '1212121212', 'maulik@gmail.com', 'Shahpur', '0', 4, NULL, 2, 2, 1, 1, 2),
(11, 3, 'Urvish', 'Bhadani', 'Male', '2001-01-01', '1212121212', '1212121212', 'urvish@gmail.com', 'Shahpur', '0', 4, NULL, 2, 2, 1, 1, 2),
(12, 3, 'Dharm', 'Bhadani', 'Male', '2001-01-01', '1212121212', '12', 'dharm@gmail.com', 'Shahpur', '0', 4, 2, 2, 2, 1, 1, 2),
(13, 3, 'Swasti', 'Bhadani', 'Female', '2001-01-01', '12121212121', '1212121212', 'swasti@gmail.com', 'Shahpur', '0', 4, NULL, 1, 2, 1, 1, 2),
(14, 3, 'Aarush', 'Bhadani', 'Male', '2001-01-01', '1212121212', '12', 'aarush@gmail.com', 'Shahpur', '0', 4, NULL, 2, 2, 1, 1, 2),
(15, 4, 'Ghanshyambhai', 'Donda', 'Male', '1999-01-01', '1212121212', '12', 'ghanshayam@gmail.com', 'Nari', '0', 4, NULL, 2, 2, 1, 1, 2),
(16, 5, 'Vallabhai', 'Ghasadiya', 'Male', '1999-01-01', '1212121212', '12', 'vallabhbhai@gmail.com', 'Shahpur', '0', 3, 2, 1, 1, 2, 2, 1),
(17, 5, 'Manjuben', 'Ghasadiya', 'Female', '1999-01-01', '1212', '1212', 'manju@gmail.com', 'ghanghali', '0', 4, NULL, 2, 2, 1, 1, 2),
(19, 7, 'kamleshbhai', 'kakadiya', 'Male', '1999-01-01', '1212121212', '1212211212', 'kamleshbhai@gmail.com', 'patana', '0', 4, 1, 2, 2, 1, 1, 2),
(22, 5, 'Naynaben', 'Ghasadiya', 'Female', '1999-01-01', '1212121212', '1212121212', 'nayna@gmail.com', 'Shahpur', '0', 3, NULL, 1, 1, 2, 2, 1),
(23, 7, 'Prapti', 'Kakadiya', 'Female', '2001-01-01', '1212121212', '1212121212', 'prapti@gmail.com', 'Patna', '0', 3, NULL, 1, 1, 2, 2, 1),
(24, 7, 'Shitalben', 'Kakadiya', 'Female', '1999-01-01', '1212121212', '1211121212', 'shital@gmail.com', 'patana', '0', 3, NULL, 1, 1, 2, 2, 1),
(25, 3, 'Tulshibhai', 'Bhadani', 'Male', '1998-01-01', '1212121212', '1212121212', 'tulshi@gmail.com', 'shahpur', '0', 4, NULL, 1, 2, 1, 1, 2),
(27, 3, 'Gadha Baa', 'Bhadani', 'Female', '1998-01-01', '1212121212', '12', 'gadga@gmail.com', 'Shahpur', '0', 4, NULL, 2, 2, 1, 1, 2),
(28, 4, 'Putali ben', 'Donda', 'Female', '1999-01-01', '1212121212', '1212121212', 'putali@gmail.com', 'Nari', '0', 3, NULL, 1, 1, 2, 2, 1),
(29, 5, 'Harshadbhai', 'Ghasadiya', 'Male', '1999-01-01', '12121212122', '1212121212', 'harshad@gmail.com', 'shahpur', '0', 3, NULL, 1, 1, 2, 2, 1),
(30, 5, 'Shailesh', 'Ghasadiya', 'Male', '1999-10-10', '1212121212', '1212121212', 'shailesh@gmail.com', 'Shahpur', '0', 4, NULL, 2, 2, 1, 1, 2),
(32, 5, 'Maulik', 'Ghasadiya', 'Male', '1100-01-01', '1212121212', '1212121212', 'maulik@gmail.com', 'sha', '0', 4, NULL, 2, 2, 1, 1, 2),
(33, 5, 'Maulik', 'Ghasadiya', 'Male', '2000-01-01', '12', '1212121212', 'maulik@gmail.com', 'Shahpur', '0', 4, NULL, 2, 2, 1, 1, 2),
(34, 8, 'Demo Husband', '', 'Male', '2000-01-09', '1212121212', '1212121212', 'demo@gmail.com', 'demo', '0', 4, 1, 2, 2, 1, 1, 2),
(35, 3, 'Demo Wife', 'Demo', 'Female', '2000-01-01', '1212121212', '1212121212', 'demo@gmail.com', 'demo', '0', 4, NULL, 1, 1, 2, 2, 1);

-- --------------------------------------------------------

--
-- Table structure for table `pooja_vruksha`
--

CREATE TABLE `pooja_vruksha` (
  `Pooja_Vruksha_Id` int(11) NOT NULL,
  `Pooja_Vruksha_Name` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `pooja_vruksha`
--

INSERT INTO `pooja_vruksha` (`Pooja_Vruksha_Id`, `Pooja_Vruksha_Name`) VALUES
(1, 'peepal'),
(2, 'banyan');

-- --------------------------------------------------------

--
-- Table structure for table `sutra`
--

CREATE TABLE `sutra` (
  `Sutra_Id` int(11) NOT NULL,
  `Sutra_Name` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `sutra`
--

INSERT INTO `sutra` (`Sutra_Id`, `Sutra_Name`) VALUES
(1, 'Rigveda'),
(2, 'Yajurveda');

-- --------------------------------------------------------

--
-- Table structure for table `vamsha`
--

CREATE TABLE `vamsha` (
  `Vamsha_Id` int(11) NOT NULL,
  `Vamsha_Name` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `vamsha`
--

INSERT INTO `vamsha` (`Vamsha_Id`, `Vamsha_Name`) VALUES
(1, 'Uddi'),
(2, 'Pidathala');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `family`
--
ALTER TABLE `family`
  ADD PRIMARY KEY (`Family_Id`),
  ADD KEY `Gotra_Id` (`Gotra_Id`);

--
-- Indexes for table `family_relation`
--
ALTER TABLE `family_relation`
  ADD PRIMARY KEY (`Relation_Id`),
  ADD KEY `Person_Id` (`Person_Id`),
  ADD KEY `Related_Person_Id` (`Related_Person_Id`);

--
-- Indexes for table `gothra`
--
ALTER TABLE `gothra`
  ADD PRIMARY KEY (`Gotra_Id`);

--
-- Indexes for table `kula_devatha`
--
ALTER TABLE `kula_devatha`
  ADD PRIMARY KEY (`Kula_Devatha_Id`);

--
-- Indexes for table `mane_devru`
--
ALTER TABLE `mane_devru`
  ADD PRIMARY KEY (`Mane_Devru_Id`);

--
-- Indexes for table `panchang_sudhi`
--
ALTER TABLE `panchang_sudhi`
  ADD PRIMARY KEY (`Panchang_Sudhi_Id`);

--
-- Indexes for table `person`
--
ALTER TABLE `person`
  ADD PRIMARY KEY (`Person_Id`),
  ADD KEY `Family_Id` (`Family_Id`),
  ADD KEY `Gotra_Id` (`Gotra_Id`),
  ADD KEY `Sutra_Id` (`Sutra_Id`),
  ADD KEY `Panchang_Sudhi_Id` (`Panchang_Sudhi_Id`),
  ADD KEY `Vamsha_Id` (`Vamsha_Id`),
  ADD KEY `Mane_Devru_Id` (`Mane_Devru_Id`),
  ADD KEY `Kula_Devatha_Id` (`Kula_Devatha_Id`),
  ADD KEY `Pooja_Vruksha_Id` (`Pooja_Vruksha_Id`);

--
-- Indexes for table `pooja_vruksha`
--
ALTER TABLE `pooja_vruksha`
  ADD PRIMARY KEY (`Pooja_Vruksha_Id`);

--
-- Indexes for table `sutra`
--
ALTER TABLE `sutra`
  ADD PRIMARY KEY (`Sutra_Id`);

--
-- Indexes for table `vamsha`
--
ALTER TABLE `vamsha`
  ADD PRIMARY KEY (`Vamsha_Id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `family`
--
ALTER TABLE `family`
  MODIFY `Family_Id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `family_relation`
--
ALTER TABLE `family_relation`
  MODIFY `Relation_Id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=57;

--
-- AUTO_INCREMENT for table `gothra`
--
ALTER TABLE `gothra`
  MODIFY `Gotra_Id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `kula_devatha`
--
ALTER TABLE `kula_devatha`
  MODIFY `Kula_Devatha_Id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `mane_devru`
--
ALTER TABLE `mane_devru`
  MODIFY `Mane_Devru_Id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `panchang_sudhi`
--
ALTER TABLE `panchang_sudhi`
  MODIFY `Panchang_Sudhi_Id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `person`
--
ALTER TABLE `person`
  MODIFY `Person_Id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=36;

--
-- AUTO_INCREMENT for table `pooja_vruksha`
--
ALTER TABLE `pooja_vruksha`
  MODIFY `Pooja_Vruksha_Id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `sutra`
--
ALTER TABLE `sutra`
  MODIFY `Sutra_Id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `vamsha`
--
ALTER TABLE `vamsha`
  MODIFY `Vamsha_Id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `family`
--
ALTER TABLE `family`
  ADD CONSTRAINT `family_ibfk_1` FOREIGN KEY (`Gotra_Id`) REFERENCES `gothra` (`Gotra_Id`);

--
-- Constraints for table `family_relation`
--
ALTER TABLE `family_relation`
  ADD CONSTRAINT `family_relation_ibfk_1` FOREIGN KEY (`Person_Id`) REFERENCES `person` (`Person_Id`),
  ADD CONSTRAINT `family_relation_ibfk_2` FOREIGN KEY (`Related_Person_Id`) REFERENCES `person` (`Person_Id`);

--
-- Constraints for table `person`
--
ALTER TABLE `person`
  ADD CONSTRAINT `person_ibfk_1` FOREIGN KEY (`Family_Id`) REFERENCES `family` (`Family_Id`),
  ADD CONSTRAINT `person_ibfk_2` FOREIGN KEY (`Gotra_Id`) REFERENCES `gothra` (`Gotra_Id`),
  ADD CONSTRAINT `person_ibfk_3` FOREIGN KEY (`Sutra_Id`) REFERENCES `sutra` (`Sutra_Id`),
  ADD CONSTRAINT `person_ibfk_4` FOREIGN KEY (`Panchang_Sudhi_Id`) REFERENCES `panchang_sudhi` (`Panchang_Sudhi_Id`),
  ADD CONSTRAINT `person_ibfk_5` FOREIGN KEY (`Vamsha_Id`) REFERENCES `vamsha` (`Vamsha_Id`),
  ADD CONSTRAINT `person_ibfk_6` FOREIGN KEY (`Mane_Devru_Id`) REFERENCES `mane_devru` (`Mane_Devru_Id`),
  ADD CONSTRAINT `person_ibfk_7` FOREIGN KEY (`Kula_Devatha_Id`) REFERENCES `kula_devatha` (`Kula_Devatha_Id`),
  ADD CONSTRAINT `person_ibfk_8` FOREIGN KEY (`Pooja_Vruksha_Id`) REFERENCES `pooja_vruksha` (`Pooja_Vruksha_Id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
