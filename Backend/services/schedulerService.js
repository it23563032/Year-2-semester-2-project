const cron = require('node-cron');
const DailyReportService = require('./dailyReportService');
const EmailSettings = require('../Model/EmailSettings');

class SchedulerService {
  constructor() {
    this.jobs = new Map();
    this.reportService = new DailyReportService();
    this.sendingReports = new Set(); // Track reports currently being sent
  }

  // Start scheduler for an admin
  startSchedulerForAdmin(adminId) {
    this.stopSchedulerForAdmin(adminId); // Stop existing job if any
    
    // Schedule the job to run every minute to check if it's time to send
    const job = cron.schedule('* * * * *', async () => {
      try {
        await this.checkAndSendReport(adminId);
      } catch (error) {
        console.error(`Error in scheduled report for admin ${adminId}:`, error);
      }
    }, {
      scheduled: false, // Don't start immediately
      timezone: 'Asia/Colombo' // Set timezone to prevent timing issues
    });

    this.jobs.set(adminId.toString(), job);
    job.start();
    console.log(`📅 Scheduler started for admin: ${adminId}`);
  }

  // Stop scheduler for an admin
  stopSchedulerForAdmin(adminId) {
    const job = this.jobs.get(adminId.toString());
    if (job) {
      job.stop();
      this.jobs.delete(adminId.toString());
      console.log(`⏹️ Scheduler stopped for admin: ${adminId}`);
    }
  }

  // Check if it's time to send report and send if needed
  async checkAndSendReport(adminId) {
    try {
      // Quick check first - if we already sent today, skip the database query
      const emailSettings = await EmailSettings.findOne({ adminId });
      if (!emailSettings || !emailSettings.isEnabled) {
        return; // No settings or disabled
      }

      // Quick check - if we already sent today, skip processing
      const now = new Date();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (emailSettings.lastSent && emailSettings.lastSent >= today) {
        return; // Already sent today, skip
      }

      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const currentDate = now.getDate();

      // Check if it's time to send based on frequency
      let shouldSend = false;

      switch (emailSettings.frequency) {
        case 'daily':
          shouldSend = this.isExactTimeToSend(
            currentHour, 
            currentMinute, 
            emailSettings.sendTime.hour, 
            emailSettings.sendTime.minute
          );
          break;

        case 'weekly':
          if (emailSettings.dayOfWeek !== null && currentDay === emailSettings.dayOfWeek) {
            shouldSend = this.isExactTimeToSend(
              currentHour, 
              currentMinute, 
              emailSettings.sendTime.hour, 
              emailSettings.sendTime.minute
            );
          }
          break;

        case 'monthly':
          if (emailSettings.dayOfMonth && currentDate === emailSettings.dayOfMonth) {
            shouldSend = this.isExactTimeToSend(
              currentHour, 
              currentMinute, 
              emailSettings.sendTime.hour, 
              emailSettings.sendTime.minute
            );
          }
          break;
      }

      if (shouldSend) {
        // Check if we already sent today (more strict check)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Check if lastSent is today and within the same hour to prevent multiple sends
        const lastSentToday = emailSettings.lastSent && 
          emailSettings.lastSent >= today && 
          emailSettings.lastSent.getHours() === currentHour;
        
        if (!lastSentToday) {
          // Check if we're already sending a report for this admin
          const adminIdStr = adminId.toString();
          if (this.sendingReports.has(adminIdStr)) {
            console.log(`⏭️ Skipping report for admin ${adminId} - already being sent`);
            return;
          }

          // Mark as sending
          this.sendingReports.add(adminIdStr);
          
          try {
            console.log(`📧 Sending scheduled report for admin: ${adminId} at ${currentHour}:${currentMinute}`);
            const result = await this.reportService.sendDailyReport(adminId);
            
            if (result && result.success) {
              console.log(`✅ Report sent successfully for admin: ${adminId}`);
            }
          } finally {
            // Always remove from sending set, even if there was an error
            this.sendingReports.delete(adminIdStr);
          }
        } else {
          console.log(`⏭️ Skipping report for admin ${adminId} - already sent today at ${emailSettings.lastSent.getHours()}:${emailSettings.lastSent.getMinutes()}`);
        }
      }
    } catch (error) {
      console.error(`Error checking scheduled report for admin ${adminId}:`, error);
    }
  }

  // Check if current time matches send time (within 1 minute tolerance)
  isTimeToSend(currentHour, currentMinute, sendHour, sendMinute) {
    const currentTimeMinutes = currentHour * 60 + currentMinute;
    const sendTimeMinutes = sendHour * 60 + sendMinute;
    
    // Allow 1 minute tolerance
    return Math.abs(currentTimeMinutes - sendTimeMinutes) <= 1;
  }

  // Check if current time exactly matches send time (exact match)
  isExactTimeToSend(currentHour, currentMinute, sendHour, sendMinute) {
    return currentHour === sendHour && currentMinute === sendMinute;
  }

  // Start scheduler for all admins with enabled email reports
  async startAllSchedulers() {
    try {
      // Clear any existing schedulers first
      this.stopAllSchedulers();
      
      const enabledSettings = await EmailSettings.find({ isEnabled: true });
      for (const settings of enabledSettings) {
        this.startSchedulerForAdmin(settings.adminId);
      }
      console.log(`📅 Started schedulers for ${enabledSettings.length} admins`);
    } catch (error) {
      console.error('Error starting all schedulers:', error);
    }
  }

  // Stop all schedulers
  stopAllSchedulers() {
    for (const [adminId, job] of this.jobs) {
      job.stop();
    }
    this.jobs.clear();
    console.log('⏹️ All schedulers stopped');
  }

  // Restart scheduler for an admin (useful when settings change)
  restartSchedulerForAdmin(adminId) {
    this.stopSchedulerForAdmin(adminId);
    this.startSchedulerForAdmin(adminId);
  }
}

module.exports = SchedulerService;
