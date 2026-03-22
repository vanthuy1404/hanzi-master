const { spawnSync } = require('child_process')

const maxAttempts = Number(process.env.MIGRATE_MAX_ATTEMPTS || 10)
const delayMs = Number(process.env.MIGRATE_RETRY_DELAY_MS || 5000)

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
      stdio: 'inherit',
      shell: true,
      env: process.env,
    })

    if (result.status === 0) {
      return
    }

    if (attempt === maxAttempts) {
      process.exit(result.status || 1)
    }

    console.log(
      `[migrate] attempt ${attempt}/${maxAttempts} failed, retrying in ${delayMs}ms...`,
    )
    await sleep(delayMs)
  }
}

main().catch((error) => {
  console.error('[migrate] unexpected error:', error)
  process.exit(1)
})
