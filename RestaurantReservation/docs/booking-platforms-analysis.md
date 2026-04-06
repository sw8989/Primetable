# Restaurant Booking Platforms Analysis

This document provides a detailed analysis of the major restaurant booking platforms used by exclusive London restaurants. Understanding these platforms is essential for building effective automated booking tools.

## 1. OpenTable

### Structure Overview
- **Base URL**: `https://www.opentable.com`
- **Restaurant Pages**: `/restaurant/profile/{restaurant-slug}/{restaurant-id}`
- **Booking Flow**: Multi-step process with client-side routing

### Booking Process Steps
1. **Initial Restaurant Page**: Shows basic information and availability search
2. **Date Selection**: Calendar view with available dates
3. **Time Selection**: Grid of available time slots
4. **Party Size Selection**: Dropdown or button group
5. **Contact Information**: Form for name, email, phone
6. **Confirmation**: Booking summary and confirmation button

### Key Selectors
- **Date Calendar**: `.datepicker__calendar`
- **Date Cells**: `.datepicker__day`
- **Time Slots**: `.time-slot`
- **Party Size**: `.party-size-selector`
- **Contact Form**: `#reservation-form`
- **Submit Button**: `.reserve-button`

### Timing Strategy
- Most restaurants release tables at midnight (GMT) exactly 28, 30, 60, or 90 days in advance
- Refreshing at 23:59:50 and clicking as soon as slots appear is effective
- Some restaurants release additional tables a few days before the date
- Special slots may be reserved for hotel guests (e.g., Chiltern Firehouse)

## 2. Resy

### Structure Overview
- **Base URL**: `https://resy.com`
- **Restaurant Pages**: `/restaurants/{city}/{restaurant-slug}`
- **Booking Flow**: Modal-based interface with fewer steps

### Booking Process Steps
1. **Initial Restaurant Page**: Shows the restaurant profile
2. **Reservation Button**: Opens a modal dialog
3. **Date/Time/Party Selection**: All on a single screen
4. **Contact Information**: Form with personal details
5. **Confirmation**: Review and submit

### Key Selectors
- **Reservation Button**: `.ReservationButton`
- **Date Picker**: `.DatePicker`
- **Time Selection**: `.TimeSlot`
- **Party Size**: `.PartySize`
- **Contact Form**: `.ContactForm`
- **Submit Button**: `.Submit`

### Timing Strategy
- Releases are typically at midnight local time
- Some restaurants use "Notify" feature for hard-to-book slots
- Premium "Resy Select" members get early access to reservations
- Need to monitor for cancellations throughout the day

## 3. SevenRooms

### Structure Overview
- **Base URL**: Various (often embedded in restaurant websites)
- **Widget format**: Embedded iframe or direct integration
- **Booking Flow**: Customized for each restaurant but follows a pattern

### Booking Process Steps
1. **Widget Initialization**: Load booking component
2. **Date Selection**: Calendar interface
3. **Time & Party Size**: Usually combined in one view
4. **Guest Details**: More extensive form with special requests
5. **Confirmation**: Submit reservation

### Key Selectors
- **Date Picker**: `.sr-date-picker`
- **Calendar Days**: `.sr-day`
- **Time Slots**: `.sr-time-slot`
- **Guest Form**: `.sr-guest-details`
- **Submit Button**: `.sr-book-button`

### Timing Strategy
- More variable release schedule - some at midnight, others at specific times
- Often has waitlist functionality that should be leveraged
- High-end restaurants may hold back tables for VIPs
- Third-party distribution of inventory may vary

## 4. Tock

### Structure Overview
- **Base URL**: `https://www.exploretock.com`
- **Restaurant Pages**: `/restaurants/{city}/{restaurant-slug}`
- **Booking Flow**: Experience-focused approach with upfront deposits

### Booking Process Steps
1. **Experience Selection**: Choose dining experience or menu
2. **Date Selection**: Calendar showing availability
3. **Time Selection**: Available time slots
4. **Party Size**: Number of guests
5. **Guest Information**: Contact details
6. **Payment**: Often requires upfront deposit or card details
7. **Confirmation**: Final review and submit

### Key Selectors
- **Experience Cards**: `.experience-card`
- **Date Picker**: `.tock-date-picker`
- **Available Dates**: `.available-date`
- **Time Selection**: `.time-select`
- **Guest Form**: `.guest-form`
- **Payment Section**: `.payment-details`
- **Submit Button**: `.book-button`

### Timing Strategy
- Releases often at specific pre-announced times, not always midnight
- Many restaurants require pre-payment, adding complexity
- Has a "Notify" feature for sold-out dates
- Premium "Tock Passkey" members get early access

## Automated Booking Implementation Strategy

For each platform, we need to implement:

1. **Platform detection**: Identify which booking system a restaurant uses
2. **URL construction**: Build the correct booking URL
3. **Navigation flow**: Programmatically move through the booking steps
4. **Selector mapping**: Maintain up-to-date selectors for each platform
5. **Timing optimization**: Schedule booking attempts at optimal times
6. **Error handling**: Manage failures and retry mechanisms
7. **Confirmation verification**: Ensure booking was successful

## Additional Considerations

### Anti-Bot Measures
- All platforms implement some form of bot detection
- Captchas may appear if multiple rapid bookings are attempted
- IP-based rate limiting is common
- Browser fingerprinting may be used

### Simulation vs. Real Booking
- Initial testing should use simulation mode
- Real bookings require careful timing and user consent
- Consider ethical implications of automated systems

### Future-Proofing
- Platforms update their UIs periodically
- Maintain a monitoring system to detect changes
- Consider a fallback to manual booking when automation fails