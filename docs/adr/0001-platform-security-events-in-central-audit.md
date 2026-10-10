---
status: accepted
---

# Keep platform security events in the central audit trail

Anonymous authentication failures have no verified business, so Nexus records them as validated platform security events with a nullable business reference in the existing central audit system. Business events still require a verified business reference, and owner queries exclude platform events; trusted authentication/security paths alone may write platform events. This replaces assigning new events to a fictitious default business and avoids creating a separate audit store, while preserving historical records and requiring explicit action and permission checks for the nullable scope.
