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

func (s Security) bytes() []byte {
	level := byte(s.Level)
	event := byte(s.Event)
	seconds1 := byte((int16(s.Seconds) >> 8) & 0xff)
	seconds2 := byte(int16(s.Seconds) & 0xff)
	return []byte{level, event, seconds1, seconds2}
}
