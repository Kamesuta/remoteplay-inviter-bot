-- CreateTable
CREATE TABLE `UserData` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `daemonId` VARCHAR(191) NOT NULL,
    `daemonVersion` VARCHAR(191) NULL,

    UNIQUE INDEX `UserData_userId_key`(`userId`),
    UNIQUE INDEX `UserData_daemonId_key`(`daemonId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
