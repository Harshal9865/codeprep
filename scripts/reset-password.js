#!/usr/bin/env node

/**
 * CodePrep Administrative Script: Reset Master Passphrase
 * Usage: node scripts/reset-password.js <new-passphrase>
 * Description: Directly resets the single instance owner password in the SQLite database.
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function resetPassword() {
  const newPassphrase = process.argv[2];

  if (!newPassphrase) {
    console.error('Error: Please provide a new master passphrase.');
    console.error('Usage: node scripts/reset-password.js <new-passphrase>');
    process.exit(1);
  }

  if (newPassphrase.length < 10) {
    console.error('Error: Master passphrase must be at least 10 characters long.');
    process.exit(1);
  }

  try {
    const user = await prisma.user.findFirst();

    if (!user) {
      console.error('Error: No owner account exists in this instance yet.');
      console.error('Please start the application and register via the web interface.');
      process.exit(1);
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(newPassphrase, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Invalidate all existing refresh tokens for security
    await prisma.refreshToken.deleteMany({
      where: { userId: user.id },
    });

    console.log('Success: Master passphrase successfully updated for account:', user.email);
    console.log('All active sessions have been invalidated. Please sign in with your new passphrase.');
  } catch (error) {
    console.error('Failed to reset master passphrase:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

resetPassword();

