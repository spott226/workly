const { google } = require('googleapis');
const pool = require('../../config/db');
const oauth2Client = require('./googleOAuthClient');

const getCalendarClientForBusiness = async (businessId) => {
  const res = await pool.query(
    `
    SELECT google_refresh_token
    FROM businesses
    WHERE id = $1
      AND active = true
      AND google_refresh_token IS NOT NULL
    `,
    [businessId]
  );

  if (!res.rows.length) {
    throw new Error('Business not connected to Google');
  }

  const { google_refresh_token } = res.rows[0];

  oauth2Client.setCredentials({
    refresh_token: google_refresh_token
  });

  return google.calendar({
    version: 'v3',
    auth: oauth2Client
  });
};

const createCalendarEvent = async (businessId, eventData) => {
  const calendar = await getCalendarClientForBusiness(businessId);

  const event = {
    summary: eventData.title,
    description: eventData.description || '',
    start: {
      dateTime: eventData.start,
      timeZone: eventData.timezone
    },
    end: {
      dateTime: eventData.end,
      timeZone: eventData.timezone
    }
  };

  const res = await calendar.events.insert({
    calendarId: 'primary',
    resource: event
  });

  return res.data;
};

const updateCalendarEvent = async (businessId, eventId, start, end, timezone) => {
  const calendar = await getCalendarClientForBusiness(businessId);

  await calendar.events.patch({
    calendarId: 'primary',
    eventId,
    resource: {
      start: { dateTime: start, timeZone: timezone },
      end: { dateTime: end, timeZone: timezone }
    }
  });
};

const deleteCalendarEvent = async (businessId, eventId) => {
  const calendar = await getCalendarClientForBusiness(businessId);

  await calendar.events.delete({
    calendarId: 'primary',
    eventId
  });
};

module.exports = {
  getCalendarClientForBusiness,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent
};
