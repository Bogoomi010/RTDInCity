param(
  [string]$SourceDir = (Join-Path $PSScriptRoot "..\public\assets\generated\common-sprites"),
  [string]$OutputDir = (Join-Path $PSScriptRoot "..\public\assets\generated\common-runtime")
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$code = @"
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;

public static class CommonRuntimeSpriteBuilder
{
    private const int FrameSize = 144;
    private const int FrameCount = 4;
    private static readonly string[] UnitIds = new[] {
        "dv1", "pc1", "sn1", "dr1", "dm1", "tf1", "fl1", "fb1", "hp1", "hc1"
    };

    public static void Build(string sourceDir, string outputDir)
    {
        Directory.CreateDirectory(outputDir);

        foreach (string id in UnitIds)
        {
            string characterPath = Path.Combine(sourceDir, id + "_character_sheet.png");
            string attackPath = Path.Combine(sourceDir, id + "_attack_motion_sheet.png");

            using (Bitmap character = LoadBitmap(characterPath))
            using (Bitmap attack = LoadBitmap(attackPath))
            using (Bitmap bust = ExtractToFrame(character, CharacterRect(character, 0.00, 0.00, 0.49, 0.84), true))
            using (Bitmap front = ExtractToFrame(character, CharacterRect(character, 0.47, 0.00, 0.27, 0.84), false))
            using (Bitmap back = ExtractToFrame(character, CharacterRect(character, 0.72, 0.00, 0.28, 0.84), false))
            using (Bitmap side = ExtractToFrame(attack, AttackRect(attack, 0), false))
            {
                bust.Save(Path.Combine(outputDir, id + "_bust.png"), ImageFormat.Png);
                SaveSheet(Path.Combine(outputDir, id + "_walk_front_sheet.png"), front, front, front, front);
                SaveSheet(Path.Combine(outputDir, id + "_walk_back_sheet.png"), back, back, back, back);
                SaveSheet(Path.Combine(outputDir, id + "_walk_side_sheet.png"), side, side, side, side);

                Bitmap[] attackFrames = new Bitmap[FrameCount];
                try
                {
                    for (int i = 0; i < FrameCount; i++)
                    {
                        attackFrames[i] = ExtractToFrame(attack, AttackRect(attack, i), false);
                    }
                    SaveSheet(Path.Combine(outputDir, id + "_attack_sheet.png"), attackFrames);
                }
                finally
                {
                    foreach (Bitmap frame in attackFrames)
                    {
                        if (frame != null) frame.Dispose();
                    }
                }
            }
        }
    }

    private static Bitmap LoadBitmap(string path)
    {
        if (!File.Exists(path))
        {
            throw new FileNotFoundException("Missing generated common sprite source.", path);
        }

        using (Bitmap loaded = new Bitmap(path))
        {
            return new Bitmap(loaded);
        }
    }

    private static Rectangle CharacterRect(Bitmap src, double x, double y, double w, double h)
    {
        int rx = Clamp((int)Math.Round(src.Width * x), 0, src.Width - 1);
        int ry = Clamp((int)Math.Round(src.Height * y), 0, src.Height - 1);
        int rw = Clamp((int)Math.Round(src.Width * w), 1, src.Width - rx);
        int rh = Clamp((int)Math.Round(src.Height * h), 1, src.Height - ry);
        return new Rectangle(rx, ry, rw, rh);
    }

    private static Rectangle AttackRect(Bitmap src, int frame)
    {
        int left = (int)Math.Floor((double)src.Width * frame / FrameCount);
        int right = (int)Math.Floor((double)src.Width * (frame + 1) / FrameCount);
        return new Rectangle(left, 0, Math.Max(1, right - left), src.Height);
    }

    private static Bitmap ExtractToFrame(Bitmap src, Rectangle rect, bool bust)
    {
        using (Bitmap crop = Crop(src, rect))
        {
            RemoveConnectedGreyBackground(crop);
            RemoveFlatBackgroundComponents(crop);
            RemoveBorderFragments(crop);
            Rectangle bounds = FindOpaqueBounds(crop);
            if (bounds.Width <= 0 || bounds.Height <= 0)
            {
                return new Bitmap(FrameSize, FrameSize, PixelFormat.Format32bppArgb);
            }

            int maxW = bust ? 134 : 128;
            int maxH = bust ? 136 : 132;
            double scale = Math.Min((double)maxW / bounds.Width, (double)maxH / bounds.Height);
            int dw = Math.Max(1, (int)Math.Round(bounds.Width * scale));
            int dh = Math.Max(1, (int)Math.Round(bounds.Height * scale));
            int dx = (FrameSize - dw) / 2;
            int dy = bust ? (FrameSize - dh) / 2 : FrameSize - 6 - dh;

            Bitmap frame = new Bitmap(FrameSize, FrameSize, PixelFormat.Format32bppArgb);
            using (Graphics g = Graphics.FromImage(frame))
            {
                g.Clear(Color.Transparent);
                g.CompositingMode = CompositingMode.SourceOver;
                g.CompositingQuality = CompositingQuality.HighQuality;
                g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                g.PixelOffsetMode = PixelOffsetMode.HighQuality;
                g.SmoothingMode = SmoothingMode.None;
                g.DrawImage(crop, new Rectangle(dx, dy, dw, dh), bounds, GraphicsUnit.Pixel);
            }
            return frame;
        }
    }

    private static void RemoveBorderFragments(Bitmap bmp)
    {
        int w = bmp.Width;
        int h = bmp.Height;
        bool[] visited = new bool[w * h];
        Queue<int> queue = new Queue<int>();
        List<int> component = new List<int>();

        for (int y0 = 0; y0 < h; y0++)
        {
            for (int x0 = 0; x0 < w; x0++)
            {
                int start = y0 * w + x0;
                if (visited[start] || bmp.GetPixel(x0, y0).A == 0) continue;

                component.Clear();
                visited[start] = true;
                queue.Enqueue(start);
                int minX = x0;
                int maxX = x0;
                bool touchesSide = x0 == 0 || x0 == w - 1;

                while (queue.Count > 0)
                {
                    int idx = queue.Dequeue();
                    component.Add(idx);
                    int x = idx % w;
                    int y = idx / w;
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (x == 0 || x == w - 1) touchesSide = true;

                    TryEnqueueOpaque(bmp, visited, queue, w, h, x + 1, y);
                    TryEnqueueOpaque(bmp, visited, queue, w, h, x - 1, y);
                    TryEnqueueOpaque(bmp, visited, queue, w, h, x, y + 1);
                    TryEnqueueOpaque(bmp, visited, queue, w, h, x, y - 1);
                }

                int componentWidth = maxX - minX + 1;
                bool smallSideFragment =
                    touchesSide &&
                    component.Count >= 4 &&
                    (componentWidth <= Math.Max(10, w / 8) || component.Count <= (w * h) / 80);

                if (!smallSideFragment) continue;

                foreach (int idx in component)
                {
                    bmp.SetPixel(idx % w, idx / w, Color.Transparent);
                }
            }
        }
    }

    private static void RemoveFlatBackgroundComponents(Bitmap bmp)
    {
        int w = bmp.Width;
        int h = bmp.Height;
        bool[] visited = new bool[w * h];
        Queue<int> queue = new Queue<int>();
        List<int> component = new List<int>();

        for (int y0 = 0; y0 < h; y0++)
        {
            for (int x0 = 0; x0 < w; x0++)
            {
                int start = y0 * w + x0;
                if (visited[start] || bmp.GetPixel(x0, y0).A == 0) continue;

                component.Clear();
                visited[start] = true;
                queue.Enqueue(start);
                int dark = 0;
                int saturated = 0;

                while (queue.Count > 0)
                {
                    int idx = queue.Dequeue();
                    component.Add(idx);
                    int x = idx % w;
                    int y = idx / w;
                    Color c = bmp.GetPixel(x, y);
                    int max = Math.Max(c.R, Math.Max(c.G, c.B));
                    int min = Math.Min(c.R, Math.Min(c.G, c.B));
                    int avg = (c.R + c.G + c.B) / 3;
                    if (avg < 72) dark++;
                    if ((max - min) > 46) saturated++;

                    TryEnqueueOpaque(bmp, visited, queue, w, h, x + 1, y);
                    TryEnqueueOpaque(bmp, visited, queue, w, h, x - 1, y);
                    TryEnqueueOpaque(bmp, visited, queue, w, h, x, y + 1);
                    TryEnqueueOpaque(bmp, visited, queue, w, h, x, y - 1);
                }

                if (component.Count >= 12 && dark == 0 && saturated == 0)
                {
                    foreach (int idx in component)
                    {
                        bmp.SetPixel(idx % w, idx / w, Color.Transparent);
                    }
                }
            }
        }
    }

    private static void TryEnqueueOpaque(
        Bitmap bmp,
        bool[] visited,
        Queue<int> queue,
        int w,
        int h,
        int x,
        int y)
    {
        if (x < 0 || y < 0 || x >= w || y >= h) return;
        int idx = y * w + x;
        if (visited[idx] || bmp.GetPixel(x, y).A == 0) return;
        visited[idx] = true;
        queue.Enqueue(idx);
    }

    private static Bitmap Crop(Bitmap src, Rectangle rect)
    {
        Bitmap crop = new Bitmap(rect.Width, rect.Height, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(crop))
        {
            g.Clear(Color.Transparent);
            g.DrawImage(src, new Rectangle(0, 0, rect.Width, rect.Height), rect, GraphicsUnit.Pixel);
        }
        return crop;
    }

    private static void RemoveConnectedGreyBackground(Bitmap bmp)
    {
        int w = bmp.Width;
        int h = bmp.Height;
        bool[] visited = new bool[w * h];
        Queue<int> queue = new Queue<int>();
        Color[] rowBackground = EstimateRowBackground(bmp);

        Action<int, int> enqueue = (x, y) => {
            if (x < 0 || y < 0 || x >= w || y >= h) return;
            int idx = y * w + x;
            if (visited[idx]) return;
            Color c = bmp.GetPixel(x, y);
            if (!IsGeneratedSheetBackground(c, rowBackground[y])) return;
            visited[idx] = true;
            queue.Enqueue(idx);
        };

        for (int x = 0; x < w; x++)
        {
            enqueue(x, 0);
            enqueue(x, h - 1);
        }
        for (int y = 0; y < h; y++)
        {
            enqueue(0, y);
            enqueue(w - 1, y);
        }

        while (queue.Count > 0)
        {
            int idx = queue.Dequeue();
            int x = idx % w;
            int y = idx / w;
            bmp.SetPixel(x, y, Color.Transparent);

            enqueue(x + 1, y);
            enqueue(x - 1, y);
            enqueue(x, y + 1);
            enqueue(x, y - 1);
        }
    }

    private static Color[] EstimateRowBackground(Bitmap bmp)
    {
        int w = bmp.Width;
        int h = bmp.Height;
        Color[] rows = new Color[h];
        Color fallback = EstimateCornerBackground(bmp);

        for (int y = 0; y < h; y++)
        {
            long r = 0;
            long g = 0;
            long b = 0;
            int count = 0;
            int edge = Math.Min(10, Math.Max(1, w / 12));

            for (int i = 0; i < edge; i++)
            {
                AddBackgroundSample(bmp.GetPixel(i, y), ref r, ref g, ref b, ref count);
                AddBackgroundSample(bmp.GetPixel(w - 1 - i, y), ref r, ref g, ref b, ref count);
            }

            rows[y] = count > 0
                ? Color.FromArgb((int)(r / count), (int)(g / count), (int)(b / count))
                : (y > 0 ? rows[y - 1] : fallback);
        }

        return rows;
    }

    private static Color EstimateCornerBackground(Bitmap bmp)
    {
        long r = 0;
        long g = 0;
        long b = 0;
        int count = 0;
        int sx = Math.Min(24, bmp.Width);
        int sy = Math.Min(24, bmp.Height);

        for (int y = 0; y < sy; y++)
        {
            for (int x = 0; x < sx; x++)
            {
                AddBackgroundSample(bmp.GetPixel(x, y), ref r, ref g, ref b, ref count);
                AddBackgroundSample(bmp.GetPixel(bmp.Width - 1 - x, y), ref r, ref g, ref b, ref count);
            }
        }

        if (count == 0) return Color.FromArgb(128, 128, 128);
        return Color.FromArgb((int)(r / count), (int)(g / count), (int)(b / count));
    }

    private static void AddBackgroundSample(Color c, ref long r, ref long g, ref long b, ref int count)
    {
        int max = Math.Max(c.R, Math.Max(c.G, c.B));
        int min = Math.Min(c.R, Math.Min(c.G, c.B));
        int avg = (c.R + c.G + c.B) / 3;
        if ((max - min) > 24 || avg < 58 || avg > 230) return;
        r += c.R;
        g += c.G;
        b += c.B;
        count++;
    }

    private static bool IsGeneratedSheetBackground(Color c, Color background)
    {
        int max = Math.Max(c.R, Math.Max(c.G, c.B));
        int min = Math.Min(c.R, Math.Min(c.G, c.B));
        int avg = (c.R + c.G + c.B) / 3;
        int distance =
            Math.Abs(c.R - background.R) +
            Math.Abs(c.G - background.G) +
            Math.Abs(c.B - background.B);
        return (max - min) <= 38 && avg >= 58 && avg <= 238 && distance <= 95;
    }

    private static Rectangle FindOpaqueBounds(Bitmap bmp)
    {
        int minX = bmp.Width;
        int minY = bmp.Height;
        int maxX = -1;
        int maxY = -1;

        for (int y = 0; y < bmp.Height; y++)
        {
            for (int x = 0; x < bmp.Width; x++)
            {
                if (bmp.GetPixel(x, y).A == 0) continue;
                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
            }
        }

        if (maxX < minX || maxY < minY) return Rectangle.Empty;
        return Rectangle.FromLTRB(minX, minY, maxX + 1, maxY + 1);
    }

    private static void SaveSheet(string path, params Bitmap[] frames)
    {
        using (Bitmap sheet = new Bitmap(FrameSize * frames.Length, FrameSize, PixelFormat.Format32bppArgb))
        using (Graphics g = Graphics.FromImage(sheet))
        {
            g.Clear(Color.Transparent);
            g.CompositingMode = CompositingMode.SourceOver;
            g.InterpolationMode = InterpolationMode.NearestNeighbor;
            g.PixelOffsetMode = PixelOffsetMode.Half;

            for (int i = 0; i < frames.Length; i++)
            {
                g.DrawImage(frames[i], i * FrameSize, 0, FrameSize, FrameSize);
            }

            sheet.Save(path, ImageFormat.Png);
        }
    }

    private static int Clamp(int value, int min, int max)
    {
        if (value < min) return min;
        if (value > max) return max;
        return value;
    }
}
"@

Add-Type -TypeDefinition $code -ReferencedAssemblies "System.Drawing"

$resolvedSource = (Resolve-Path $SourceDir).Path
$resolvedOutput = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($OutputDir)
[CommonRuntimeSpriteBuilder]::Build($resolvedSource, $resolvedOutput)
Write-Host "Generated runtime common sprites: $resolvedOutput"
