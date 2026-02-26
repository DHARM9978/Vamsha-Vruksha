-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Feb 02, 2026 at 12:52 PM
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

-- --------------------------------------------------------

--
-- Table structure for table `gothra`
--

CREATE TABLE `gothra` (
  `Gotra_Id` int(11) NOT NULL,
  `Gotra_Name` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `kula_devatha`
--

CREATE TABLE `kula_devatha` (
  `Kula_Devatha_Id` int(11) NOT NULL,
  `Kula_Devatha_Name` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `mane_devru`
--

CREATE TABLE `mane_devru` (
  `Mane_Devru_Id` int(11) NOT NULL,
  `Mane_Devru_Name` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `panchang_sudhi`
--

CREATE TABLE `panchang_sudhi` (
  `Panchang_Sudhi_Id` int(11) NOT NULL,
  `Panchang_Sudhi_Name` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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

-- --------------------------------------------------------

--
-- Table structure for table `pooja_vruksha`
--

CREATE TABLE `pooja_vruksha` (
  `Pooja_Vruksha_Id` int(11) NOT NULL,
  `Pooja_Vruksha_Name` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sutra`
--

CREATE TABLE `sutra` (
  `Sutra_Id` int(11) NOT NULL,
  `Sutra_Name` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `vamsha`
--

CREATE TABLE `vamsha` (
  `Vamsha_Id` int(11) NOT NULL,
  `Vamsha_Name` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `family`
--
ALTER TABLE `family`
  ADD PRIMARY KEY (`Family_Id`),
  ADD KEY `family_ibfk_1` (`Gotra_Id`);

--
-- Indexes for table `family_relation`
--
ALTER TABLE `family_relation`
  ADD PRIMARY KEY (`Relation_Id`),
  ADD KEY `family_relation_ibfk_1` (`Person_Id`),
  ADD KEY `family_relation_ibfk_2` (`Related_Person_Id`);

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
  ADD KEY `person_ibfk_1` (`Family_Id`),
  ADD KEY `person_ibfk_2` (`Gotra_Id`),
  ADD KEY `person_ibfk_3` (`Sutra_Id`),
  ADD KEY `person_ibfk_4` (`Panchang_Sudhi_Id`),
  ADD KEY `person_ibfk_5` (`Vamsha_Id`),
  ADD KEY `person_ibfk_6` (`Mane_Devru_Id`),
  ADD KEY `person_ibfk_7` (`Kula_Devatha_Id`),
  ADD KEY `person_ibfk_8` (`Pooja_Vruksha_Id`);

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
  MODIFY `Family_Id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `family_relation`
--
ALTER TABLE `family_relation`
  MODIFY `Relation_Id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `gothra`
--
ALTER TABLE `gothra`
  MODIFY `Gotra_Id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `kula_devatha`
--
ALTER TABLE `kula_devatha`
  MODIFY `Kula_Devatha_Id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `mane_devru`
--
ALTER TABLE `mane_devru`
  MODIFY `Mane_Devru_Id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `panchang_sudhi`
--
ALTER TABLE `panchang_sudhi`
  MODIFY `Panchang_Sudhi_Id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `person`
--
ALTER TABLE `person`
  MODIFY `Person_Id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `pooja_vruksha`
--
ALTER TABLE `pooja_vruksha`
  MODIFY `Pooja_Vruksha_Id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sutra`
--
ALTER TABLE `sutra`
  MODIFY `Sutra_Id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `vamsha`
--
ALTER TABLE `vamsha`
  MODIFY `Vamsha_Id` int(11) NOT NULL AUTO_INCREMENT;

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
