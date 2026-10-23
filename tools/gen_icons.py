# -*- coding: utf-8 -*-
"""
统一线性图标生成器（无需第三方依赖）

设计空间：24 x 24，线宽 1.9，圆头端点，折角自然。
渲染方式：对画布逐像素计算到图元集合的最小距离（SDF），边缘 1px 抗锯齿。
输出：透明底 PNG（tabBar 81x81，页面图标 48x48）

用法： python tools/gen_icons.py
"""
import os
import math
import zlib
import struct

BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
ICONS_DIR = os.path.join(BASE, 'miniprogram', 'images', 'icons')
TABBAR_DIR = os.path.join(BASE, 'miniprogram', 'images', 'tabbar')

LW = 1.9  # 24 空间下的线宽


# ---------------------------------------------------------------- primitives
def seg(x1, y1, x2, y2):
    return ('seg', x1, y1, x2, y2)


def ring(cx, cy, r):
    return ('ring', cx, cy, r)


def arc(cx, cy, r, a0, a1):
    # 角度以比例 pi 表示，例如 (1.25, 1.75) 表示 1.25pi ~ 1.75pi
    return ('arc', cx, cy, r, a0 * math.pi, a1 * math.pi)


def rect(x1, y1, x2, y2):
    return [seg(x1, y1, x2, y1), seg(x2, y1, x2, y2),
            seg(x2, y2, x1, y2), seg(x1, y2, x1, y1)]


def _d_seg(px, py, x1, y1, x2, y2):
    dx, dy = x2 - x1, y2 - y1
    if dx == 0 and dy == 0:
        return math.hypot(px - x1, py - y1)
    t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)
    t = max(0.0, min(1.0, t))
    return math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))


def _d_ring(px, py, cx, cy, r):
    return abs(math.hypot(px - cx, py - cy) - r)


def _d_arc(px, py, cx, cy, r, a0, a1):
    dx, dy = px - cx, py - cy
    d = math.hypot(dx, dy)
    a = math.atan2(dy, dx)
    while a < a0:
        a += 2 * math.pi
    while a >= a0 + 2 * math.pi:
        a -= 2 * math.pi
    if a <= a1:
        return abs(d - r)
    p0 = (cx + r * math.cos(a0), cy + r * math.sin(a0))
    p1 = (cx + r * math.cos(a1), cy + r * math.sin(a1))
    return min(math.hypot(px - p0[0], py - p0[1]),
               math.hypot(px - p1[0], py - p1[1]))


def _dist(p, prims):
    best = 1e9
    for g in prims:
        if g[0] == 'seg':
            v = _d_seg(p[0], p[1], g[1], g[2], g[3], g[4])
        elif g[0] == 'ring':
            v = _d_ring(p[0], p[1], g[1], g[2], g[3])
        else:
            v = _d_arc(p[0], p[1], g[1], g[2], g[3], g[4], g[5])
        if v < best:
            best = v
    return best


# ---------------------------------------------------------------- icon shapes
def S(*items):
    out = []
    for it in items:
        if isinstance(it, list):
            out.extend(it)
        else:
            out.append(it)
    return out


SHAPES = {
    'home': S(seg(3, 11, 12, 3.2), seg(12, 3.2, 21, 11),
              seg(5, 10, 5, 20.5), seg(5, 20.5, 19, 20.5), seg(19, 20.5, 19, 10),
              seg(9.6, 14.6, 9.6, 20.5), seg(9.6, 20.5, 14.4, 20.5),
              seg(14.4, 20.5, 14.4, 14.6)),

    'calendar': S(rect(3.2, 5.5, 20.8, 20.5), seg(3.2, 10, 20.8, 10),
                  seg(8, 3, 8, 7.2), seg(16, 3, 16, 7.2),
                  seg(7.4, 14.4, 10.4, 14.4), seg(13.6, 14.4, 16.6, 14.4),
                  seg(7.4, 17.6, 16.6, 17.6)),

    'clipboard': S(rect(5, 4.2, 19, 20.5),
                   seg(9.5, 4.2, 9.5, 2.5), seg(9.5, 2.5, 14.5, 2.5),
                   seg(14.5, 2.5, 14.5, 4.2),
                   seg(8.5, 13, 11, 15.5), seg(11, 15.5, 15.5, 10)),

    'user': S(ring(12, 8.2, 3.9), arc(12, 15.2, 6.4, 0.12, 0.88)),

    'clock': S(ring(12, 12, 8.6), seg(12, 12, 12, 7), seg(12, 12, 16, 13.4)),

    'location': S(arc(12, 10.5, 6.5, 1.0, 2.0),
                  seg(5.5, 10.5, 12, 21), seg(18.5, 10.5, 12, 21)),

    'users': S(ring(9.5, 8, 3.4), arc(9.5, 15.2, 6.3, 0.12, 0.88),
               ring(17, 10, 2.7), arc(17, 16.4, 4.8, 0.12, 0.88)),

    'building': S(seg(4, 20.5, 4, 5.5), seg(4, 5.5, 20, 5.5),
                  seg(20, 5.5, 20, 20.5), seg(4, 20.5, 20, 20.5),
                  seg(8.8, 9.2, 8.8, 17.2), seg(15.2, 9.2, 15.2, 17.2),
                  seg(8.8, 13.2, 15.2, 13.2)),

    'ticket': S(rect(3.2, 7.5, 20.8, 16.5),
                seg(12, 8.6, 12, 11.4), seg(12, 12.6, 12, 15.4)),

    'phone': S(rect(6.5, 2.5, 17.5, 21.5), seg(10.5, 18.6, 13.5, 18.6)),

    'mail': S(rect(3, 6, 21, 18), seg(3, 6, 12, 13.4), seg(21, 6, 12, 13.4)),

    'school': S(seg(2.5, 10, 12, 4.5), seg(21.5, 10, 12, 4.5),
                seg(5, 10, 5, 19.5), seg(19, 10, 19, 19.5),
                seg(3, 19.5, 21, 19.5),
                seg(9.5, 19.5, 9.5, 14), seg(9.5, 14, 14.5, 14),
                seg(14.5, 14, 14.5, 19.5)),

    'cap': S(seg(12, 4.5, 21, 9), seg(21, 9, 12, 13.5),
             seg(12, 13.5, 3, 9), seg(3, 9, 12, 4.5),
             seg(5.5, 11, 5.5, 17), seg(5.5, 17, 11.5, 17),
             seg(19, 11, 19, 16), seg(19, 16, 21.8, 18.8)),

    'tag': S(seg(3, 11.5, 11.5, 3), seg(11.5, 3, 20.5, 12),
             seg(20.5, 12, 12, 20.5), seg(12, 20.5, 3, 11.5),
             ring(16.2, 7.8, 1.5)),

    'mic': S(ring(12, 10.5, 3.2), seg(12, 13.7, 12, 18.5),
             seg(8.5, 18.5, 15.5, 18.5)),

    'spark': S(seg(12, 3, 13.6, 10.4), seg(13.6, 10.4, 21, 12),
               seg(21, 12, 13.6, 13.6), seg(13.6, 13.6, 12, 21),
               seg(12, 21, 10.4, 13.6), seg(10.4, 13.6, 3, 12),
               seg(3, 12, 10.4, 10.4), seg(10.4, 10.4, 12, 3)),

    'wifi': S(arc(12, 17.5, 8, 1.22, 1.78), arc(12, 17.5, 4.6, 1.16, 1.84),
              ring(12, 17.8, 0.9)),

    'arrow-right': S(seg(4, 12, 19, 12), seg(14.5, 7.5, 19.5, 12),
                     seg(14.5, 16.5, 19.5, 12)),

    'chevron-left': S(seg(14.5, 5, 8, 12), seg(8, 12, 14.5, 19)),
    'chevron-right': S(seg(9.5, 5, 16, 12), seg(16, 12, 9.5, 19)),
    'chevron-down': S(seg(6, 9.5, 12, 15.5), seg(18, 9.5, 12, 15.5)),

    'check': S(seg(4.5, 12.5, 9.5, 17.5), seg(9.5, 17.5, 19.5, 6.5)),
    'close': S(seg(6, 6, 18, 18), seg(18, 6, 6, 18)),
    'plus': S(seg(12, 5, 12, 19), seg(5, 12, 19, 12)),

    'search': S(ring(10.5, 10.5, 6.2), seg(15, 15, 20, 20)),

    'share': S(ring(17.5, 6, 2.6), ring(6.5, 12, 2.6), ring(17.5, 18, 2.6),
               seg(8.8, 10.5, 15.2, 7.3), seg(8.8, 13.5, 15.2, 16.7)),

    'image': S(rect(3.5, 5, 20.5, 19), ring(8.5, 9.5, 1.7),
               seg(4.2, 17.5, 9, 12.6), seg(9, 12.6, 14, 17),
               seg(14, 17, 20, 11.5)),

    'trash': S(seg(4, 6.5, 20, 6.5),
               seg(9.5, 6.5, 9.5, 4), seg(9.5, 4, 13.5, 4),
               seg(13.5, 4, 13.5, 6.5),
               seg(6.2, 6.5, 7.2, 20.5), seg(17.8, 6.5, 16.8, 20.5),
               seg(7.2, 20.5, 16.8, 20.5),
               seg(10, 9.8, 10.6, 17.4), seg(14, 9.8, 13.4, 17.4)),

    'info': S(ring(12, 12, 8.6), seg(12, 10.8, 12, 17), ring(12, 7.4, 0.95)),

    'filter': S(seg(3.5, 8, 20.5, 8), ring(9, 8, 2.2),
                seg(3.5, 16, 20.5, 16), ring(15, 16, 2.2)),

    'note': S(rect(5, 3.5, 19, 20.5), seg(8, 8.5, 16, 8.5),
              seg(8, 12.5, 16, 12.5), seg(8, 16.5, 14, 16.5)),
}


# ---------------------------------------------------------------- renderer
def render(prims, size, content, color):
    scale = content / 24.0
    off = (size - content) / 2.0
    half = LW * scale / 2.0
    r, g, b = color
    rows = []
    for y in range(size):
        row = bytearray()
        for x in range(size):
            p = ((x + 0.5 - off) / scale, (y + 0.5 - off) / scale)
            d = _dist(p, prims) * scale
            a = half + 0.55 - d
            if a <= 0:
                row += b'\x00\x00\x00\x00'
            elif a >= 1:
                row += bytes((r, g, b, 255))
            else:
                row += bytes((r, g, b, int(round(a * 255))))
        rows.append(row)
    return rows


def write_png(path, size, rows):
    raw = b''.join(b'\x00' + bytes(r) for r in rows)

    def chunk(tag, data):
        c = struct.pack('>I', len(data)) + tag + data
        return c + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)

    ihdr = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)
    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr) + \
        chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b'')
    with open(path, 'wb') as f:
        f.write(png)


def hex2rgb(h):
    h = h.lstrip('#')
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


PRIMARY = '#2456E8'
SLATE = '#64748B'
INK = '#0F172A'
WHITE = '#FFFFFF'
GREEN = '#16A34A'
RED = '#E5484D'
AMBER = '#F59E0B'
GRAY = '#9AA4B8'

# 页面图标：名称 -> 需要生成的颜色
UI_ICONS = {
    'clock': [SLATE, PRIMARY, WHITE],
    'location': [SLATE, PRIMARY, WHITE],
    'users': [SLATE, PRIMARY],
    'calendar': [SLATE, PRIMARY, WHITE],
    'building': [SLATE],
    'ticket': [PRIMARY, WHITE, SLATE],
    'phone': [SLATE],
    'mail': [SLATE],
    'school': [SLATE],
    'cap': [SLATE],
    'tag': [SLATE, PRIMARY],
    'mic': [PRIMARY, SLATE],
    'spark': [AMBER, PRIMARY, WHITE],
    'wifi': [SLATE, PRIMARY],
    'arrow-right': [SLATE, WHITE],
    'chevron-left': [WHITE, INK],
    'chevron-right': [SLATE],
    'chevron-down': [SLATE],
    'check': [GREEN, PRIMARY, WHITE],
    'close': [SLATE, WHITE],
    'plus': [WHITE, PRIMARY],
    'search': [SLATE],
    'share': [SLATE, WHITE],
    'image': [WHITE, SLATE, PRIMARY],
    'trash': [RED, SLATE],
    'info': [SLATE, PRIMARY],
    'filter': [SLATE, PRIMARY],
    'note': [SLATE, PRIMARY],
    'clipboard': [SLATE, WHITE],
    'user': [SLATE, WHITE],
    'trash': [RED, SLATE, WHITE],
    'info': [SLATE, PRIMARY, WHITE],
}

COLOR_SUFFIX = {
    PRIMARY: 'p',
    SLATE: 's',
    INK: 'k',
    WHITE: 'w',
    GREEN: 'g',
    RED: 'r',
    AMBER: 'a',
    GRAY: 'n',
}

TABBAR = ['home', 'calendar', 'clipboard', 'user']


def main():
    os.makedirs(ICONS_DIR, exist_ok=True)
    os.makedirs(TABBAR_DIR, exist_ok=True)

    # tabBar 图标（81x81，内容 52）
    for name in TABBAR:
        prims = SHAPES[name]
        for color, suf in ((GRAY, ''), (PRIMARY, '_on')):
            rows = render(prims, 81, 52, hex2rgb(color))
            path = os.path.join(TABBAR_DIR, '%s%s.png' % (name, suf))
            write_png(path, 81, rows)

    # 页面图标（48x48，内容 40）
    for name, colors in UI_ICONS.items():
        prims = SHAPES[name]
        for color in colors:
            rows = render(prims, 48, 40, hex2rgb(color))
            fname = '%s_%s.png' % (name, COLOR_SUFFIX[color])
            write_png(os.path.join(ICONS_DIR, fname), 48, rows)

    total = len(TABBAR) * 2 + sum(len(v) for v in UI_ICONS.values())
    print('icons generated: %d files' % total)


if __name__ == '__main__':
    main()
