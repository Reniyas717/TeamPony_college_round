# Nexus

Nexus lets a business owner manage business operations in one workspace. The shared language covers ownership, business accountability, and webinar management.

## Language

### Ownership

**Nexus account**:
A person's identity in Nexus. Each account owns exactly one business.

**Business**:
The business represented by one Nexus account. Its owner controls its customer records, websites, events, and other business operations.

**Business owner**:
The person who owns the business represented by their Nexus account. Each business has one owner.
_Avoid_: Team member, organization administrator

### Business accountability

**Audit event**:
A historical record identifying an action, its authority, the affected business resource, and its outcome.
_Avoid_: Pageview, debug message

**Business audit event**:
An audit event associated with a verified business, such as an owner's change to a contact or webinar.

**Platform security event**:
An audit event for a security action with no verified business, such as an anonymous failed login. It does not belong to an individual owner's business history.
_Avoid_: Default-business event

**Executor**:
The human, AI agent, system process, or external integration that performs an action.
_Avoid_: Initiator when referring to the performer

**Initiator**:
The identity that requests an action, including a business owner who asks an AI agent to perform it.

**Approver**:
The identity that explicitly authorizes an action requiring approval.

### Webinars

**Webinar session**:
One scheduled online event with its own registrations and attendance records.
_Avoid_: Meeting instance, seminar

**Webinar series**:
A group of webinar sessions offered through one registration form, where a person selects the sessions they want to attend.
_Avoid_: Webinar group

**Registration**:
A person's reservation for a particular webinar session. A series form can create registrations for multiple selected sessions.
_Avoid_: Attendance, RSVP response

**Registrant**:
A person who has registered for a webinar session, whether or not they attend it.
_Avoid_: Attendee before attendance is established

**Participant**:
A person represented in the video platform's attendance records, including people who have no matching registration or identifiable contact details.
_Avoid_: Registrant when no registration is known

**Attendance**:
A record that a participant entered a webinar session, regardless of how briefly they stayed. Multiple visits belong to the same participant when their identity can be established.

**No-show**:
A registrant who did not attend their webinar session.

**Cancellation**:
The decision that a webinar session will not proceed, while retaining the event and its associated records.

**Event follow-up**:
A one-time email associated with a webinar session, with different messages for attendees and no-shows. The attendee message requests feedback and may invite interest in the business's product or subscription.
_Avoid_: Ongoing marketing campaign

**Marketing opt-in**:
A person's separate, explicit choice to receive future marketing emails. Registration and receipt of an event follow-up do not constitute this choice.

**Deletion**:
Permanent removal of a webinar session and its associated webinar records, or a series and all its sessions. Shared CRM contacts and their independent marketing opt-ins survive webinar deletion.

**Feedback**:
A response about a completed webinar session that includes a rating, usefulness, optional comments, and interest in the business's product or subscription.

**Follow-up service**:
An optional service selected by the owner to prepare event follow-up emails after a webinar session. The owner reviews and schedules those emails before they are sent.

**Session draft**:
A webinar session the owner has saved without scheduling it.

**Event notification**:
An email confirming registration or communicating a session reschedule or cancellation. It is independent of the optional follow-up service.

**Registration capacity**:
The optional maximum number of registrations accepted for one webinar session.

**Registration deadline**:
The point after which a session no longer accepts registrations, defaulting to its scheduled start.
