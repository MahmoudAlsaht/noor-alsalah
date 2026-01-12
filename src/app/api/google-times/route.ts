import { NextResponse } from 'next/server';

/**
 * Prayer time data structure from Google
 */
interface GooglePrayerData {
    fajr: string;
    sunrise: string;
    dhuhr: string;
    asr: string;
    maghrib: string;
    isha: string;
    source: string;
    fetchedAt: string;
}

/**
 * GET /api/google-times
 * 
 * Fetches prayer times from Google Search results for Irbid, Jordan.
 * This runs server-side to bypass CORS restrictions.
 * 
 * @returns Prayer times parsed from Google Search or error
 */
export async function GET() {
    const searchQuery = encodeURIComponent('مواعيد الصلاة في إربد');
    const url = `https://www.google.com/search?q=${searchQuery}`;

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
            },
            // Cache for 12 hours
            next: { revalidate: 43200 },
        });

        if (!response.ok) {
            throw new Error(`Google returned status ${response.status}`);
        }

        const html = await response.text();

        // Parse prayer times from HTML
        // Google displays times in a structured way, we extract using regex
        const timeRegex = /(\d{1,2}:\d{2}\s*[AP]M)/gi;
        const times = html.match(timeRegex);

        if (!times || times.length < 6) {
            // Can't parse - return empty with error flag
            return NextResponse.json(
                {
                    success: false,
                    error: 'Could not parse prayer times from Google',
                    rawTimesFound: times?.length || 0,
                },
                { status: 200 }
            );
        }

        // Map extracted times to prayer names
        // Google typically shows: Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha
        const prayerData: GooglePrayerData = {
            fajr: times[0],
            sunrise: times[1],
            dhuhr: times[2],
            asr: times[3],
            maghrib: times[4],
            isha: times[5],
            source: 'Google Search (Jordan Ministry of Awqaf)',
            fetchedAt: new Date().toISOString(),
        };

        return NextResponse.json({
            success: true,
            data: prayerData,
        });
    } catch (error) {
        console.error('Error fetching from Google:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
