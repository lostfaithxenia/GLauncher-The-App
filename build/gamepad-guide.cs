using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Threading;

class GamepadGuideWatcher
{
    [StructLayout(LayoutKind.Sequential)]
    struct XInputGamepad
    {
        public ushort wButtons;
        public byte bLeftTrigger;
        public byte bRightTrigger;
        public short sThumbLX;
        public short sThumbLY;
        public short sThumbRX;
        public short sThumbRY;
    }

    [StructLayout(LayoutKind.Sequential)]
    struct XInputState
    {
        public uint dwPacketNumber;
        public XInputGamepad Gamepad;
    }

    [StructLayout(LayoutKind.Sequential)]
    struct JoyInfoEx
    {
        public int dwSize;
        public int dwFlags;
        public int dwXpos;
        public int dwYpos;
        public int dwZpos;
        public int dwRpos;
        public int dwUpos;
        public int dwVpos;
        public uint dwButtons;
        public uint dwButtonNumber;
        public uint dwPOV;
        public uint dwReserved1;
        public uint dwReserved2;
    }

    // Ordinal 100 in xinput1_4.dll exposes bit 0x0400 (Guide / Power button)
    [DllImport("xinput1_4.dll", EntryPoint = "#100")]
    static extern uint XInputGetStateEx(uint dwUserIndex, ref XInputState pState);

    [DllImport("winmm.dll")]
    static extern uint joyGetPosEx(uint uJoyID, ref JoyInfoEx pji);

    const ushort XINPUT_DPAD_UP = 0x0001;
    const ushort XINPUT_DPAD_DOWN = 0x0002;
    const ushort XINPUT_DPAD_LEFT = 0x0004;
    const ushort XINPUT_DPAD_RIGHT = 0x0008;
    const ushort XINPUT_START = 0x0010;
    const ushort XINPUT_BACK = 0x0020;
    const ushort XINPUT_GUIDE = 0x0400;
    const ushort XINPUT_A = 0x1000;
    const ushort XINPUT_B = 0x2000;
    const ushort XINPUT_X = 0x4000;

    // DirectInput / DualShock 4 & 3rd-Party PS4 Controller bitmasks:
    // Bit 0 (0x0001): Square
    // Bit 1 (0x0002): Cross (A)
    // Bit 2 (0x0004): Circle (B)
    // Bit 3 (0x0008): Triangle
    // Bit 8 (0x0100): Share
    // Bit 9 (0x0200): Options
    // Bit 12 (0x1000): PS Home Button (Button 13)
    // Bit 13 (0x2000): Touchpad Click / 3rd-Party PS4 Home Button (Button 14)
    // Bit 16 (0x10000): Extended Guide Button (Button 17)
    const uint DINPUT_HOME_MASK = 0x00013000; // 0x1000 | 0x2000 | 0x10000
    const uint DINPUT_CHORD_MASK = 0x00000300; // Share (0x0100) + Options (0x0200)

    const int JOY_RETURNALL = 0x000000FF;

    static long lastGuideEmitMs = -1000;
    static long lastNavABXEmitMs = -1000;

    static void Emit(string msg)
    {
        Console.WriteLine(msg);
        Console.Out.Flush();
    }

    static void EmitGuide(long nowMs)
    {
        if (nowMs - lastGuideEmitMs < 400) return;
        lastGuideEmitMs = nowMs;
        Emit("GUIDE");
    }

    static void EmitAction(string action, long nowMs)
    {
        if (nowMs - lastNavABXEmitMs < 140) return;
        lastNavABXEmitMs = nowMs;
        Emit(action);
    }

    static void Main()
    {
        bool[] prevXGuide = new bool[4];
        bool[] prevXA = new bool[4];
        bool[] prevXB = new bool[4];
        bool[] prevXX = new bool[4];
        long[] lastXDirMs = new long[4];

        bool[] prevJoyHome = new bool[16];
        bool[] prevJoyA = new bool[16];
        bool[] prevJoyB = new bool[16];
        bool[] prevJoyX = new bool[16];
        long[] lastJoyDirMs = new long[16];

        Stopwatch sw = Stopwatch.StartNew();

        while (true)
        {
            long nowMs = sw.ElapsedMilliseconds;
            bool anyXInputConnected = false;

            // 1. Poll all 4 XInput slots
            for (uint i = 0; i < 4; i++)
            {
                try
                {
                    XInputState st = new XInputState();
                    if (XInputGetStateEx(i, ref st) == 0)
                    {
                        anyXInputConnected = true;
                        ushort b = st.Gamepad.wButtons;

                        bool chord = (b & (XINPUT_BACK | XINPUT_START)) == (XINPUT_BACK | XINPUT_START);
                        bool guide = ((b & XINPUT_GUIDE) != 0) || chord;
                        if (guide && !prevXGuide[i]) EmitGuide(nowMs);
                        prevXGuide[i] = guide;

                        bool btnA = (b & XINPUT_A) != 0;
                        if (btnA && !prevXA[i]) EmitAction("NAV:A", nowMs);
                        prevXA[i] = btnA;

                        bool btnB = (b & XINPUT_B) != 0;
                        if (btnB && !prevXB[i]) EmitAction("NAV:B", nowMs);
                        prevXB[i] = btnB;

                        bool btnX = (b & XINPUT_X) != 0;
                        if (btnX && !prevXX[i]) EmitAction("NAV:X", nowMs);
                        prevXX[i] = btnX;

                        bool up = (b & XINPUT_DPAD_UP) != 0 || st.Gamepad.sThumbLY > 16500;
                        bool down = (b & XINPUT_DPAD_DOWN) != 0 || st.Gamepad.sThumbLY < -16500;
                        bool left = (b & XINPUT_DPAD_LEFT) != 0 || st.Gamepad.sThumbLX < -16500;
                        bool right = (b & XINPUT_DPAD_RIGHT) != 0 || st.Gamepad.sThumbLX > 16500;

                        if ((up || down || left || right) && nowMs - lastXDirMs[i] >= 185)
                        {
                            lastXDirMs[i] = nowMs;
                            if (up) Emit("NAV:UP");
                            else if (down) Emit("NAV:DOWN");
                            else if (left) Emit("NAV:LEFT");
                            else if (right) Emit("NAV:RIGHT");
                        }
                    }
                    else
                    {
                        prevXGuide[i] = false;
                        prevXA[i] = false;
                        prevXB[i] = false;
                        prevXX[i] = false;
                    }
                }
                catch
                {
                    // ignore if xinput1_4 unavailable
                }
            }

            // 2. Always poll DirectInput / WinMM joyGetPosEx slots (0..15) so 3rd-party PS4 controllers
            // whose Home button is only exposed via DirectInput (or when DS4Windows/Steam doesn't map 0x0400)
            // still trigger GUIDE reliably!
            for (uint j = 0; j < 16; j++)
            {
                try
                {
                    JoyInfoEx joy = new JoyInfoEx();
                    joy.dwSize = Marshal.SizeOf(typeof(JoyInfoEx));
                    joy.dwFlags = JOY_RETURNALL;
                    if (joyGetPosEx(j, ref joy) == 0)
                    {
                        uint jb = joy.dwButtons;
                        bool dChord = (jb & DINPUT_CHORD_MASK) == DINPUT_CHORD_MASK;
                        bool homePressed = ((jb & DINPUT_HOME_MASK) != 0) || dChord;
                        if (homePressed && !prevJoyHome[j]) EmitGuide(nowMs);
                        prevJoyHome[j] = homePressed;

                        // If no XInput controller is handling navigation, also emit DInput navigation for PS4 pads
                        if (!anyXInputConnected)
                        {
                            // On PS4 DirectInput: Cross = bit 1 (0x0002), Circle = bit 2 (0x0004), Square = bit 0 (0x0001)
                            bool jA = (jb & 0x0002) != 0;
                            if (jA && !prevJoyA[j]) EmitAction("NAV:A", nowMs);
                            prevJoyA[j] = jA;

                            bool jB = (jb & 0x0004) != 0;
                            if (jB && !prevJoyB[j]) EmitAction("NAV:B", nowMs);
                            prevJoyB[j] = jB;

                            bool jX = (jb & 0x0001) != 0;
                            if (jX && !prevJoyX[j]) EmitAction("NAV:X", nowMs);
                            prevJoyX[j] = jX;

                            uint pov = joy.dwPOV;
                            bool hasPov = pov < 36000;
                            bool pUp = (hasPov && (pov <= 4500 || pov >= 31500)) || joy.dwYpos < 14000;
                            bool pRight = (hasPov && (pov >= 4500 && pov <= 13500)) || joy.dwXpos > 51500;
                            bool pDown = (hasPov && (pov >= 13500 && pov <= 22500)) || joy.dwYpos > 51500;
                            bool pLeft = (hasPov && (pov >= 22500 && pov <= 31500)) || joy.dwXpos < 14000;

                            if ((pUp || pDown || pLeft || pRight) && nowMs - lastJoyDirMs[j] >= 185)
                            {
                                lastJoyDirMs[j] = nowMs;
                                if (pUp) Emit("NAV:UP");
                                else if (pDown) Emit("NAV:DOWN");
                                else if (pLeft) Emit("NAV:LEFT");
                                else if (pRight) Emit("NAV:RIGHT");
                            }
                        }
                    }
                    else
                    {
                        prevJoyHome[j] = false;
                        prevJoyA[j] = false;
                        prevJoyB[j] = false;
                        prevJoyX[j] = false;
                    }
                }
                catch
                {
                    // ignore
                }
            }

            Thread.Sleep(28);
        }
    }
}
