#!/usr/bin/env node

import { spawn } from 'node:child_process'
import fs from 'node:fs'

console.log('🔄 Starting database backup from production...')

async function exec(command) {
  console.log(`Running: ${command}`)
  const child = spawn(command, { shell: true, stdio: 'inherit' })
  return new Promise((resolve, reject) => {
    child.on('exit', code => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`${command} failed rc=${code}`))
      }
    })
  })
}

async function backupDatabase() {
  try {
    // Create backup directory if it doesn't exist
    if (!fs.existsSync('./backups')) {
      fs.mkdirSync('./backups')
    }

    // Get timestamp for backup filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupFile = `./backups/production-backup-${timestamp}.sqlite`

    // Check if database exists first
    console.log('🔍 Checking if production database exists...')
    try {
      await exec(`flyctl ssh console -C "test -f /app/prisma/dev.sqlite"`)

      // SSH into production and copy database
      console.log('📦 Copying database from production...')
      await exec(`flyctl ssh console -C "cp /app/prisma/dev.sqlite /tmp/backup.sqlite"`)
      await exec(`flyctl ssh sftp get /tmp/backup.sqlite ${backupFile}`)
    } catch (error) {
      console.log('⚠️  No database found in production - this is normal for first deployment')
      console.log('🏗️  Production database will be created automatically on first use')
      return
    }

    console.log(`✅ Database backed up to: ${backupFile}`)

    // Optionally restore to local dev database
    const shouldRestore = process.argv.includes('--restore')
    if (shouldRestore) {
      console.log('🔄 Restoring backup to local dev database...')
      await exec(`cp ${backupFile} ./prisma/dev.sqlite`)
      console.log('✅ Local database restored from production backup')
    }

  } catch (error) {
    console.error('❌ Backup failed:', error.message)
    process.exit(1)
  }
}

backupDatabase()