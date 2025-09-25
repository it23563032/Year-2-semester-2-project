# 🏛️ Court Scheduling System - Complete Implementation

## 📋 System Overview

The Court Scheduling System automatically manages the workflow from case filing to court hearing scheduling across 25 districts in Sri Lanka.

## 🔄 Complete Workflow

### 1. **Case Filing by Lawyer**
```
Lawyer files case → POST /api/lawyer/file-case
├── Updates CaseModel: status = 'filed'
├── Creates CourtFiling record: status = 'filed'
└── Creates CourtScheduleRequest: isScheduled = false
```

### 2. **Schedule Request Queue**
```
CourtScheduleRequest (isScheduled: false)
├── Appears in Court Scheduler Dashboard
├── Filtered by district
└── Ready for scheduling
```

### 3. **Court Scheduling Process**
```
Scheduler selects case → Opens scheduling modal
├── Chooses date and time
├── Assigns courtroom
└── Submits schedule
```

### 4. **After Scheduling**
```
CourtScheduleRequest: isScheduled = true
├── CaseModel: status = 'hearing_scheduled'
├── CourtFiling: status = 'scheduled' (PRESERVED)
└── ScheduledCase: new record created
```

## 🗄️ Database Tables

### **CourtScheduleRequest** (Main Queue)
- **Purpose**: Holds all unscheduled case requests
- **Key Fields**: `isScheduled: false`, `district`, `priority`
- **Lifecycle**: Created when case filed → Updated when scheduled

### **ScheduledCase** (Scheduled Hearings)
- **Purpose**: Tracks all scheduled court hearings
- **Key Fields**: `hearingDate`, `hearingTime`, `courtroom`
- **Lifecycle**: Created when case is scheduled

### **CourtFiling** (Permanent Record)
- **Purpose**: Permanent record of all court filings
- **Key Fields**: `status`, `hearingDate`, `courtReference`
- **Lifecycle**: Created when filed → Updated when scheduled → NEVER DELETED

### **CaseModel** (Original Cases)
- **Purpose**: Main case records
- **Key Fields**: `status`, `hearingDate`, `courtDetails`
- **Lifecycle**: Updated throughout the process

## 🌍 District Support

**25 Districts Supported:**
- Kandy, Colombo, Jaffna, Anuradhapura, Nuwara Eliya
- Galle, Matara, Hambantota, Ratnapura, Kegalle
- Kurunegala, Puttalam, Chilaw, Gampaha, Kalutara
- Monaragala, Badulla, Batticaloa, Ampara, Trincomalee
- Vavuniya, Mannar, Kilinochchi, Mullaitivu, Polonnaruwa

## 🎯 API Endpoints

### **Court Scheduler Routes** (`/api/court-scheduler/`)
- `GET /dashboard/stats` - Dashboard statistics
- `GET /requests/unscheduled` - Unscheduled case requests
- `GET /cases/scheduled` - Scheduled cases
- `GET /timeslots/available` - Available time slots
- `POST /schedule/:requestId` - Schedule a case
- `GET /calendar` - Calendar data

### **Case Filing Routes** (`/api/lawyer/`)
- `POST /file-case` - File case (creates schedule request)

### **Client Dashboard Routes** (`/cases/`)
- `GET /my-cases/all` - Get client's cases

## 🖥️ Frontend Components

### **Court Scheduler Dashboard**
- **Location**: `/court-scheduler-dashboard`
- **Features**: District filter, case queue, calendar view, scheduling modal
- **User Role**: `court_scheduler`

### **Client Dashboard**
- **Location**: `/dashboard`
- **Features**: View cases, manage finance, manage schedule
- **User Role**: `client`, `verified_client`

## 🔒 Data Preservation Rules

### **✅ What Gets Preserved:**
1. **CourtFiling records** - NEVER deleted, only status updated
2. **CaseModel records** - Original cases remain intact
3. **CourtScheduleRequest records** - Kept for audit trail

### **✅ What Gets Created:**
1. **ScheduledCase records** - New table for scheduled hearings
2. **Hearing details** - Added to existing records

### **❌ What Gets Updated (NOT Deleted):**
1. **CourtScheduleRequest.isScheduled** - `false` → `true`
2. **CourtFiling.status** - `'filed'` → `'scheduled'`
3. **CaseModel.status** - `'filed'` → `'hearing_scheduled'`

## 🎨 UI Features

### **Court Scheduler Dashboard:**
- Professional calendar with grid layout
- Real-time stats cards
- District-based filtering
- Priority-based color coding
- Interactive scheduling modal
- Time slot management

### **Client Dashboard:**
- Case overview with status tracking
- Finance management section
- Schedule management section
- Document management

## 🔄 Status Flow

```
Case Creation → pending
↓
Lawyer Assignment → lawyer_assigned
↓
Case Filing → filed (creates CourtFiling + CourtScheduleRequest)
↓
Court Scheduling → hearing_scheduled (preserves all records)
↓
Hearing Completion → hearing_completed
```

## 🛡️ Data Integrity

- **No data loss** - All records preserved throughout the process
- **Audit trail** - Complete history maintained
- **Status tracking** - Clear status progression
- **Reference integrity** - Proper foreign key relationships

This system ensures that once a case is filed, it maintains a complete audit trail through the entire court process while enabling efficient scheduling management! 🎯
