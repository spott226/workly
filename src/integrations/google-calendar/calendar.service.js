const { google } = require('googleapis');

const getCalendar = (auth) =>
  google.calendar({ version: 'v3', auth });

const createEvent = async ({ auth, calendarId, summary, start, end }) => {
  const calendar = getCalendar(auth);

  const res = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary,
      start: { dateTime: start },
      end: { dateTime: end }
    }
  });

  return res.data.id;
};

const updateEvent = async ({ auth, calendarId, eventId, start, end }) => {
  const calendar = getCalendar(auth);

  await calendar.events.patch({
    calendarId,
    eventId,
    requestBody: {
      start: { dateTime: start },
      end: { dateTime: end }
    }
  });
};

const deleteEvent = async ({ auth, calendarId, eventId }) => {
  const calendar = getCalendar(auth);

  await calendar.events.delete({
    calendarId,
    eventId
  });
};

module.exports = {
  createEvent,
  updateEvent,
  deleteEvent
};
