package dbus

type SecurityLevel int

const (
	SecurityLevelNone SecurityLevel = iota
	SecurityLevelUnknown
	SecurityLevelDangerous
	SecurityLevelPoor
	SecurityLevelOk
)

type SecurityEvent int

const (
	SecurityEventNone SecurityEvent = iota
	SecurityEventFoo
	SecurityEventBar
	SecurityEventBaz
)

type Security struct {
	Level   SecurityLevel
	Event   SecurityEvent
	Seconds int
}

func parseSecurity(buf []byte) Security {
	level := SecurityLevel(buf[0])
	event := SecurityEvent(buf[1])
	seconds := int(int16(buf[2])<<8 | int16(buf[3]))
	return Security{level, event, seconds}
}
