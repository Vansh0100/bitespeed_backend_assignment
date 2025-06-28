require('dotenv').config();
const path = require('path');
const fs = require('fs');
const database = require('./connection');

class SeederRunner {
  constructor() {
    this.seedersDir = path.join(__dirname, 'seeders');
  }

  async getSeederFiles() {
    try {
      const files = fs.readdirSync(this.seedersDir);
      return files
        .filter(file => file.endsWith('.js'))
        .sort();
    } catch (error) {
      console.log('Error reading seeder files:', error);
      throw error;
    }
  }

  async executeSeeder(filename) {
    try {
      const seederPath = path.join(this.seedersDir, filename);
      const seeder = require(seederPath);
      
      console.log(`Executing seeder: ${filename}`);
      
      // Execute all functions in the seeder file
      for (const [key, func] of Object.entries(seeder)) {
        if (typeof func === 'function') {
          console.log(`Executing seeder function: ${key} from ${filename}`);
          await func();
        }
      }

      console.log(`Seeder ${filename} executed successfully`);
    } catch (error) {
      console.log(`Error executing seeder ${filename}:`, error);
      throw error;
    }
  }

  async runAllSeeders() {
    try {
      // Test database connection first
      await database.testConnection();
      
      const seederFiles = await this.getSeederFiles();
      
      if (seederFiles.length === 0) {
        console.log('No seeder files found');
        return;
      }

      console.log(`Found ${seederFiles.length} seeder files`);

      for (const seeder of seederFiles) {
        await this.executeSeeder(seeder);
      }

      console.log('All seeders completed successfully');
    } catch (error) {
      console.log('Seeding process failed:', error);
      throw error;
    }
  }

  async runSeeder(filename) {
    try {
      await database.testConnection();
      
      const seederPath = path.join(this.seedersDir, filename);
      if (!fs.existsSync(seederPath)) {
        throw new Error(`Seeder file not found: ${filename}`);
      }

      await this.executeSeeder(filename);
      console.log(`Seeder ${filename} completed successfully`);
    } catch (error) {
      console.log(`Failed to run seeder ${filename}:`, error);
      throw error;
    }
  }
}

// CLI execution
if (require.main === module) {
  const runner = new SeederRunner();
  const command = process.argv[2];
  const filename = process.argv[3];

  (async () => {
    try {
      switch (command) {
        case 'all':
          await runner.runAllSeeders();
          break;
        case 'run':
          if (!filename) {
            console.log('Please provide a seeder filename');
            process.exit(1);
          }
          await runner.runSeeder(filename);
          break;
        default:
          console.log('Usage: node seed.js [all|run] [filename]');
          console.log('  all: Run all seeder files');
          console.log('  run <filename>: Run specific seeder file');
      }
      process.exit(0);
    } catch (error) {
      console.log('Seeding command failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = SeederRunner;
