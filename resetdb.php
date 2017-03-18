<?PHP
include('dbconnect.php');
$conn=getConnect();

$query='
DROP TABLE *;

-- phpMyAdmin SQL Dump
-- version 4.6.6
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Mar 17, 2017 at 09:26 PM
-- Server version: 5.6.35
-- PHP Version: 7.1.1

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";



--
-- Database: `3715game`
--

-- --------------------------------------------------------

--
-- Table structure for table `lobby`
--

CREATE TABLE `lobby` (
  `name` varchar(20) NOT NULL,
  `players` int(11) NOT NULL,
  `param` text NOT NULL,
  `id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `lobby`
--
ALTER TABLE `lobby`
  ADD UNIQUE KEY `id` (`id`);

';
$conn->query($query)or die($conn->error);