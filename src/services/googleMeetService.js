/**
 * Google Meet Service
 * Google Calendar API orqali Google Meet uchrashuvlarini yaratish va boshqarish
 */

const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const GOOGLE_MEET_API = 'https://meet.googleapis.com/v2';

/**
 * Google Calendar orqali Google Meet uchrashuvi yaratish
 * @param {string} accessToken - Google OAuth2 access token
 * @param {Object} options - Uchrashuv parametrlari
 * @param {string} options.summary - Uchrashuv nomi
 * @param {string} options.description - Tavsif
 * @param {string} options.startTime - Boshlanish vaqti (ISO 8601 format)
 * @param {string} options.endTime - Tugash vaqti (ISO 8601 format)
 * @param {Array<string>} options.attendees - Ishtirokchilar email ro'yxati
 * @returns {Promise<Object>} Uchrashuv ma'lumotlari
 */
export const createGoogleMeetEvent = async (accessToken, options = {}) => {
  try {
    const {
      summary = 'Online Lesson',
      description = '',
      startTime,
      endTime,
      attendees = []
    } = options;

    // Agar vaqt ko'rsatilmagan bo'lsa, hozirgi vaqtdan 1 soat keyin
    const now = new Date();
    const start = startTime ? new Date(startTime) : now;
    const end = endTime ? new Date(endTime) : new Date(now.getTime() + 60 * 60 * 1000); // 1 soat

    const event = {
      summary,
      description,
      start: {
        dateTime: start.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: end.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet'
          }
        }
      },
      attendees: attendees.map(email => ({ email }))
    };

    const response = await fetch(`${GOOGLE_CALENDAR_API}/calendars/primary/events?conferenceDataVersion=1`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to create Google Meet event');
    }

    const data = await response.json();
    
    // Google Meet linkini olish
    const meetLink = data.conferenceData?.entryPoints?.[0]?.uri || null;
    const meetCode = meetLink ? meetLink.split('/').pop() : null;

    return {
      success: true,
      data: {
        eventId: data.id,
        meetLink,
        meetCode,
        htmlLink: data.htmlLink,
        startTime: data.start?.dateTime,
        endTime: data.end?.dateTime,
        summary: data.summary,
        description: data.description
      }
    };
  } catch (error) {
    console.error('Create Google Meet event error:', error);
    return {
      success: false,
      error: error.message || 'Failed to create Google Meet event'
    };
  }
};

/**
 * Google Meet uchrashuvini o'chirish
 * @param {string} accessToken - Google OAuth2 access token
 * @param {string} eventId - Calendar event ID
 * @returns {Promise<Object>}
 */
export const deleteGoogleMeetEvent = async (accessToken, eventId) => {
  try {
    const response = await fetch(`${GOOGLE_CALENDAR_API}/calendars/primary/events/${eventId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to delete Google Meet event');
    }

    return { success: true };
  } catch (error) {
    console.error('Delete Google Meet event error:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete Google Meet event'
    };
  }
};

/**
 * Google Meet uchrashuv ma'lumotlarini olish
 * @param {string} accessToken - Google OAuth2 access token
 * @param {string} eventId - Calendar event ID
 * @returns {Promise<Object>}
 */
export const getGoogleMeetEvent = async (accessToken, eventId) => {
  try {
    const response = await fetch(`${GOOGLE_CALENDAR_API}/calendars/primary/events/${eventId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to get Google Meet event');
    }

    const data = await response.json();
    const meetLink = data.conferenceData?.entryPoints?.[0]?.uri || null;
    const meetCode = meetLink ? meetLink.split('/').pop() : null;

    return {
      success: true,
      data: {
        eventId: data.id,
        meetLink,
        meetCode,
        htmlLink: data.htmlLink,
        startTime: data.start?.dateTime,
        endTime: data.end?.dateTime,
        summary: data.summary,
        description: data.description,
        attendees: data.attendees || []
      }
    };
  } catch (error) {
    console.error('Get Google Meet event error:', error);
    return {
      success: false,
      error: error.message || 'Failed to get Google Meet event'
    };
  }
};

/**
 * Google Meet uchrashuvini yangilash
 * @param {string} accessToken - Google OAuth2 access token
 * @param {string} eventId - Calendar event ID
 * @param {Object} updates - Yangilanishlar
 * @returns {Promise<Object>}
 */
export const updateGoogleMeetEvent = async (accessToken, eventId, updates = {}) => {
  try {
    // Avval mavjud eventni olish
    const getResponse = await fetch(`${GOOGLE_CALENDAR_API}/calendars/primary/events/${eventId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!getResponse.ok) {
      throw new Error('Failed to get event for update');
    }

    const existingEvent = await getResponse.json();

    // Yangilanishlarni qo'llash
    const updatedEvent = {
      ...existingEvent,
      ...updates,
      start: updates.startTime ? {
        dateTime: new Date(updates.startTime).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      } : existingEvent.start,
      end: updates.endTime ? {
        dateTime: new Date(updates.endTime).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      } : existingEvent.end
    };

    const response = await fetch(`${GOOGLE_CALENDAR_API}/calendars/primary/events/${eventId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatedEvent)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to update Google Meet event');
    }

    const data = await response.json();
    const meetLink = data.conferenceData?.entryPoints?.[0]?.uri || null;
    const meetCode = meetLink ? meetLink.split('/').pop() : null;

    return {
      success: true,
      data: {
        eventId: data.id,
        meetLink,
        meetCode,
        htmlLink: data.htmlLink,
        startTime: data.start?.dateTime,
        endTime: data.end?.dateTime,
        summary: data.summary,
        description: data.description
      }
    };
  } catch (error) {
    console.error('Update Google Meet event error:', error);
    return {
      success: false,
      error: error.message || 'Failed to update Google Meet event'
    };
  }
};

export const googleMeetService = {
  createEvent: createGoogleMeetEvent,
  deleteEvent: deleteGoogleMeetEvent,
  getEvent: getGoogleMeetEvent,
  updateEvent: updateGoogleMeetEvent
};

