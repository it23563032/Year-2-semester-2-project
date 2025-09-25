const CourtScheduleRequest = require('../Model/CourtScheduleRequest');
const ScheduledCase = require('../Model/ScheduledCase');
const CaseModel = require('../Model/CaseModel');
const CourtFiling = require('../Model/CourtFiling');
const UserModel = require('../Model/UserModel');

// Get all unscheduled requests by district
const getUnscheduledRequests = async (req, res) => {
  try {
    console.log('=== FETCHING UNSCHEDULED REQUESTS ===');
    const { district } = req.query;
    console.log('District filter:', district);
    
    let query = { isScheduled: false };
    if (district && district !== 'all') {
      query.district = district;
    }
    console.log('Query:', query);
    
    // First check if there are any schedule requests at all
    const allRequests = await CourtScheduleRequest.find({});
    console.log(`Total schedule requests in database: ${allRequests.length}`);
    
    const requests = await CourtScheduleRequest.find(query)
      .populate('case', 'caseNumber caseType')
      .populate('lawyer', 'name email')
      .populate('client', 'name email')
      .sort({ createdAt: -1 });
    
    console.log(`Found ${requests.length} unscheduled requests`);
    
    if (requests.length > 0) {
      console.log('Sample request:', {
        caseNumber: requests[0].caseNumber,
        district: requests[0].district,
        isScheduled: requests[0].isScheduled,
        caseType: requests[0].caseType
      });
    }
    
    res.json({
      success: true,
      count: requests.length,
      requests,
      debug: {
        totalInDb: allRequests.length,
        queryUsed: query
      }
    });
  } catch (error) {
    console.error('Error fetching unscheduled requests:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching schedule requests',
      error: error.message
    });
  }
};

// Get scheduled cases by district and date range
const getScheduledCases = async (req, res) => {
  try {
    const { district, startDate, endDate } = req.query;
    
    let query = {};
    if (district && district !== 'all') {
      query.district = district;
    }
    
    if (startDate && endDate) {
      query.hearingDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const scheduledCases = await ScheduledCase.find(query)
      .populate('case', 'caseNumber caseType')
      .populate('lawyer', 'name email')
      .populate('client', 'name email')
      .sort({ hearingDate: 1, 'hearingTime.startTime': 1 });
    
    res.json({
      success: true,
      count: scheduledCases.length,
      scheduledCases
    });
  } catch (error) {
    console.error('Error fetching scheduled cases:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching scheduled cases',
      error: error.message
    });
  }
};

// Get available time slots for a specific date and district
const getAvailableTimeSlots = async (req, res) => {
  try {
    const { district, date } = req.query;
    
    if (!district || !date) {
      return res.status(400).json({
        success: false,
        message: 'District and date are required'
      });
    }
    
    // Get all scheduled cases for the specific date and district
    const scheduledCases = await ScheduledCase.find({
      district,
      hearingDate: new Date(date)
    }).select('hearingTime courtroom');
    
    // Define standard time slots (9 AM to 5 PM, 1-hour slots)
    const standardSlots = [
      { startTime: '09:00', endTime: '10:00' },
      { startTime: '10:00', endTime: '11:00' },
      { startTime: '11:00', endTime: '12:00' },
      { startTime: '14:00', endTime: '15:00' }, // After lunch break
      { startTime: '15:00', endTime: '16:00' },
      { startTime: '16:00', endTime: '17:00' }
    ];
    
    // Get occupied time slots
    const occupiedSlots = scheduledCases.map(sc => ({
      startTime: sc.hearingTime.startTime,
      endTime: sc.hearingTime.endTime,
      courtroom: sc.courtroom
    }));
    
    // Filter available slots
    const availableSlots = standardSlots.filter(slot => {
      return !occupiedSlots.some(occupied => 
        occupied.startTime === slot.startTime && 
        occupied.endTime === slot.endTime
      );
    });
    
    res.json({
      success: true,
      date,
      district,
      availableSlots,
      occupiedSlots,
      totalSlots: standardSlots.length,
      availableCount: availableSlots.length
    });
  } catch (error) {
    console.error('Error fetching available time slots:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching available time slots',
      error: error.message
    });
  }
};

// Schedule a case (move from request to scheduled)
const scheduleCase = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { 
      hearingDate, 
      startTime, 
      endTime, 
      courtroom, 
      schedulingNotes 
    } = req.body;
    
    // Validate required fields
    if (!hearingDate || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Hearing date, start time, and end time are required'
      });
    }
    
    // Find the schedule request
    const scheduleRequest = await CourtScheduleRequest.findById(requestId);
    if (!scheduleRequest) {
      return res.status(404).json({
        success: false,
        message: 'Schedule request not found'
      });
    }
    
    if (scheduleRequest.isScheduled) {
      return res.status(400).json({
        success: false,
        message: 'This case has already been scheduled'
      });
    }
    
    // Check if the time slot is available
    const conflictingCase = await ScheduledCase.findOne({
      district: scheduleRequest.district,
      hearingDate: new Date(hearingDate),
      'hearingTime.startTime': startTime,
      'hearingTime.endTime': endTime
    });
    
    if (conflictingCase) {
      return res.status(409).json({
        success: false,
        message: 'Time slot is already occupied'
      });
    }
    
    // Create scheduled case record
    const scheduledCase = new ScheduledCase({
      scheduleRequest: scheduleRequest._id,
      case: scheduleRequest.case,
      district: scheduleRequest.district,
      courtroom: courtroom || scheduleRequest.courtroom,
      hearingDate: new Date(hearingDate),
      hearingTime: {
        startTime,
        endTime
      },
      caseNumber: scheduleRequest.caseNumber,
      caseType: scheduleRequest.caseType,
      plaintiffName: scheduleRequest.plaintiffName,
      defendantName: scheduleRequest.defendantName,
      lawyer: scheduleRequest.lawyer,
      lawyerName: scheduleRequest.lawyerName,
      client: scheduleRequest.client,
      clientName: scheduleRequest.clientName,
      scheduledBy: req.user.id,
      schedulingNotes,
      estimatedDuration: scheduleRequest.estimatedDuration
    });
    
    await scheduledCase.save();
    
    // Update the schedule request (mark as scheduled but keep the record)
    await CourtScheduleRequest.findByIdAndUpdate(requestId, {
      isScheduled: true,
      scheduledDate: new Date(hearingDate),
      scheduledTime: { startTime, endTime },
      scheduledBy: req.user.id,
      schedulingNotes
    });
    
    // Update the original case with hearing details (preserve currentLawyer)
    const currentCase = await CaseModel.findById(scheduleRequest.case);
    
    console.log('🔧 COURT SCHEDULER: Updating case with hearing details...');
    console.log('📅 Hearing Date:', hearingDate);
    console.log('⏰ Start Time:', startTime);
    console.log('⏰ End Time:', endTime);
    console.log('🏛️ Courtroom:', courtroom || scheduleRequest.courtroom);
    console.log('📋 Case ID:', scheduleRequest.case);
    console.log('👨‍💼 CRITICAL - Current Lawyer BEFORE update:', currentCase.currentLawyer);
    
    const updateResult = await CaseModel.findByIdAndUpdate(scheduleRequest.case, {
      hearingDate: new Date(hearingDate),
      hearingTime: { startTime, endTime },
      courtroom: courtroom || scheduleRequest.courtroom,
      status: 'hearing_scheduled',
      // Preserve the currentLawyer field - crucial for maintaining lawyer assignment
      currentLawyer: currentCase.currentLawyer
    }, { new: true }); // Return updated document
    
    console.log('✅ COURT SCHEDULER: Case updated successfully');
    console.log('📋 Updated case data:', {
      caseNumber: updateResult.caseNumber,
      hearingDate: updateResult.hearingDate,
      hearingTime: updateResult.hearingTime,
      courtroom: updateResult.courtroom,
      status: updateResult.status,
      currentLawyer: updateResult.currentLawyer // Add this to see if it's preserved
    });
    
    // VERIFICATION: Double-check the lawyer assignment is still intact
    if (!updateResult.currentLawyer) {
      console.error('🚨 CRITICAL ERROR: currentLawyer field was lost during scheduling!');
      console.error('🔍 Original currentLawyer:', currentCase.currentLawyer);
      console.error('🔍 After update currentLawyer:', updateResult.currentLawyer);
    } else {
      console.log('✅ VERIFICATION PASSED: currentLawyer field preserved:', updateResult.currentLawyer);
    }
    
    // Update the CourtFiling record with scheduling details (KEEP the record)
    await CourtFiling.findByIdAndUpdate(scheduleRequest.courtFiling, {
      status: 'scheduled', // Update status but keep the record
      hearingDate: new Date(hearingDate),
      scheduledBy: req.user.id,
      schedulingNotes
    });
    
    res.json({
      success: true,
      message: 'Case scheduled successfully',
      scheduledCase: await ScheduledCase.findById(scheduledCase._id)
        .populate('case', 'caseNumber caseType')
        .populate('lawyer', 'name email')
        .populate('client', 'name email')
    });
    
  } catch (error) {
    console.error('Error scheduling case:', error);
    res.status(500).json({
      success: false,
      message: 'Error scheduling case',
      error: error.message
    });
  }
};

// Get dashboard statistics
const getDashboardStats = async (req, res) => {
  try {
    const { district } = req.query;
    
    let matchQuery = {};
    if (district && district !== 'all') {
      matchQuery.district = district;
    }
    
    // Get unscheduled requests count
    const unscheduledCount = await CourtScheduleRequest.countDocuments({
      ...matchQuery,
      isScheduled: false
    });
    
    // Get scheduled cases count for current month
    const currentMonth = new Date();
    currentMonth.setDate(1);
    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    const scheduledThisMonth = await ScheduledCase.countDocuments({
      ...matchQuery,
      hearingDate: {
        $gte: currentMonth,
        $lt: nextMonth
      }
    });
    
    // Get today's hearings
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todaysHearings = await ScheduledCase.countDocuments({
      ...matchQuery,
      hearingDate: {
        $gte: today,
        $lt: tomorrow
      }
    });
    
    // Get pending by priority
    const priorityStats = await CourtScheduleRequest.aggregate([
      { $match: { ...matchQuery, isScheduled: false } },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);
    
    res.json({
      success: true,
      stats: {
        unscheduledCount,
        scheduledThisMonth,
        todaysHearings,
        priorityBreakdown: priorityStats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, { high: 0, medium: 0, low: 0 })
      }
    });
    
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics',
      error: error.message
    });
  }
};

// Get calendar data for a specific month
const getCalendarData = async (req, res) => {
  try {
    const { district, year, month } = req.query;
    
    if (!year || !month) {
      return res.status(400).json({
        success: false,
        message: 'Year and month are required'
      });
    }
    
    let matchQuery = {};
    if (district && district !== 'all') {
      matchQuery.district = district;
    }
    
    // Get start and end of the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    matchQuery.hearingDate = {
      $gte: startDate,
      $lte: endDate
    };
    
    const scheduledCases = await ScheduledCase.find(matchQuery)
      .populate('case', 'caseNumber caseType')
      .populate('lawyer', 'name')
      .populate({
        path: 'client',
        select: 'name fullName',
        model: 'VerifiedClient'
      })
      .sort({ hearingDate: 1, 'hearingTime.startTime': 1 });
    
    console.log(`📅 Found ${scheduledCases.length} scheduled cases for calendar`);
    if (scheduledCases.length > 0) {
      console.log('📋 Sample case data:', {
        caseNumber: scheduledCases[0].caseNumber,
        clientName: scheduledCases[0].clientName,
        populatedClient: scheduledCases[0].client,
        lawyerName: scheduledCases[0].lawyerName,
        populatedLawyer: scheduledCases[0].lawyer
      });
    }
    
    // Group by date
    const calendarData = {};
    scheduledCases.forEach(scheduledCase => {
      const dateKey = scheduledCase.hearingDate.toISOString().split('T')[0];
      if (!calendarData[dateKey]) {
        calendarData[dateKey] = [];
      }
      calendarData[dateKey].push({
        id: scheduledCase._id,
        caseNumber: scheduledCase.caseNumber,
        caseType: scheduledCase.caseType,
        plaintiffName: scheduledCase.plaintiffName,
        defendantName: scheduledCase.defendantName,
        lawyerName: scheduledCase.lawyerName || (scheduledCase.lawyer ? scheduledCase.lawyer.name : 'Not Assigned'),
        clientName: scheduledCase.clientName || 
                   (scheduledCase.client ? (scheduledCase.client.fullName || scheduledCase.client.name) : 'Unknown Client'),
        startTime: scheduledCase.hearingTime.startTime,
        endTime: scheduledCase.hearingTime.endTime,
        courtroom: scheduledCase.courtroom,
        status: scheduledCase.status
      });
    });
    
    res.json({
      success: true,
      year: parseInt(year),
      month: parseInt(month),
      calendarData
    });
    
  } catch (error) {
    console.error('Error fetching calendar data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching calendar data',
      error: error.message
    });
  }
};

// Generate PDF of all schedules
const generateSchedulesPDF = async (req, res) => {
  try {
    const { district, year, month } = req.query;
    
    if (!year || !month) {
      return res.status(400).json({
        success: false,
        message: 'Year and month are required'
      });
    }
    
    console.log(`📄 Generating schedules PDF for district: ${district}, year: ${year}, month: ${month}`);
    
    let matchQuery = {};
    if (district && district !== 'all') {
      matchQuery.district = district;
    }
    
    // Get start and end of the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    matchQuery.hearingDate = {
      $gte: startDate,
      $lte: endDate
    };
    
    const scheduledCases = await ScheduledCase.find(matchQuery)
      .populate('case', 'caseNumber caseType')
      .populate('lawyer', 'name')
      .populate({
        path: 'client',
        select: 'name fullName',
        model: 'VerifiedClient'
      })
      .sort({ hearingDate: 1, 'hearingTime.startTime': 1 });

    console.log(`📋 Found ${scheduledCases.length} scheduled cases for PDF`);

    // Import PDF generation library
    const PDFDocument = require('pdfkit');
    
    // Create a new PDF document
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers
    const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
    const districtName = district === 'all' ? 'All Districts' : district;
    const filename = `Court-Schedules-${districtName}-${monthName}-${year}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Pipe PDF to response
    doc.pipe(res);
    
    // PDF Header
    doc.fontSize(20).font('Helvetica-Bold');
    doc.text('COURT HEARING SCHEDULES', { align: 'center' });
    doc.moveDown(0.5);
    
    doc.fontSize(14).font('Helvetica');
    doc.text(`District: ${districtName}`, { align: 'center' });
    doc.text(`Period: ${monthName} ${year}`, { align: 'center' });
    doc.text(`Generated: ${new Date().toLocaleDateString('en-LK')}`, { align: 'center' });
    doc.moveDown(1);
    
    if (scheduledCases.length === 0) {
      doc.fontSize(12);
      doc.text('No scheduled hearings found for the selected period.', { align: 'center' });
    } else {
      // Group cases by date
      const casesByDate = {};
      scheduledCases.forEach(scheduledCase => {
        const dateKey = scheduledCase.hearingDate.toISOString().split('T')[0];
        if (!casesByDate[dateKey]) {
          casesByDate[dateKey] = [];
        }
        casesByDate[dateKey].push(scheduledCase);
      });
      
      // Generate PDF content for each date
      Object.keys(casesByDate).sort().forEach((dateKey, dateIndex) => {
        if (dateIndex > 0) doc.addPage(); // New page for each date (except first)
        
        const hearingDate = new Date(dateKey);
        const dateString = hearingDate.toLocaleDateString('en-LK', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
        
        // Date header
        doc.fontSize(16).font('Helvetica-Bold');
        doc.text(dateString, { align: 'center' });
        doc.moveDown(0.5);
        
        // Draw line under date
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.5);
        
        // Table headers
        doc.fontSize(10).font('Helvetica-Bold');
        const startY = doc.y;
        doc.text('Time', 50, startY);
        doc.text('Case Number', 120, startY);
        doc.text('Case Type', 200, startY);
        doc.text('Client', 280, startY);
        doc.text('Lawyer', 360, startY);
        doc.text('Courtroom', 440, startY);
        doc.moveDown(0.5);
        
        // Draw line under headers
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.3);
        
        // Case details
        doc.fontSize(9).font('Helvetica');
        casesByDate[dateKey].forEach((scheduledCase, index) => {
          const y = doc.y;
          
          // Check if we need a new page
          if (y > 700) {
            doc.addPage();
            doc.y = 50;
          }
          
          const clientName = scheduledCase.clientName || 
                           (scheduledCase.client ? (scheduledCase.client.fullName || scheduledCase.client.name) : 'Unknown');
          const lawyerName = scheduledCase.lawyerName || 
                           (scheduledCase.lawyer ? scheduledCase.lawyer.name : 'Not Assigned');
          
          doc.text(`${scheduledCase.hearingTime.startTime}-${scheduledCase.hearingTime.endTime}`, 50, doc.y);
          doc.text(scheduledCase.caseNumber, 120, doc.y);
          doc.text(scheduledCase.caseType, 200, doc.y);
          doc.text(clientName, 280, doc.y);
          doc.text(lawyerName, 360, doc.y);
          doc.text(scheduledCase.courtroom, 440, doc.y);
          doc.moveDown(0.4);
          
          // Add subtle line between cases
          if (index < casesByDate[dateKey].length - 1) {
            doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeOpacity(0.3).stroke().strokeOpacity(1);
            doc.moveDown(0.2);
          }
        });
      });
      
      // Footer
      doc.fontSize(8).font('Helvetica');
      doc.text(`Total Hearings: ${scheduledCases.length}`, 50, doc.page.height - 50);
      doc.text(`Report generated by Court Scheduling System`, { align: 'right' });
    }
    
    // Finalize PDF
    doc.end();
    
  } catch (error) {
    console.error('Error generating schedules PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating PDF',
      error: error.message
    });
  }
};

module.exports = {
  getUnscheduledRequests,
  getScheduledCases,
  getAvailableTimeSlots,
  scheduleCase,
  getDashboardStats,
  getCalendarData,
  generateSchedulesPDF
};
