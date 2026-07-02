import { Button } from '@/components/common/Button';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/services/firebase/config';
import { Course, courseService, lmsService } from '@/services/lms/lmsService';
import { Ionicons } from '@expo/vector-icons';
import { doc, onSnapshot } from 'firebase/firestore';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// ── WebView (react-native-webview 13.16.1) ───────────────────────────────────
let WebView: any = null;
try { WebView = require('react-native-webview').WebView; } catch (_) { }

// ── expo-video SDK 56 (fallback for Expo Go) ──────────────────────────────────
let useVideoPlayer: any = null;
let VideoView: any = null;
try {
  const ev = require('expo-video');
  useVideoPlayer = ev.useVideoPlayer;
  VideoView = ev.VideoView;
} catch (_) { }

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const getVimeoId = (url: string): string | null => {
  if (!url) return null;
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/([a-f0-9]+))?/);
  return m ? (m[2] ? `${m[1]}/${m[2]}` : m[1]) : null;
};

const getYouTubeId = (url: string): string | null => {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|watch\?v=|embed\/)([^#&?]{11})/);
  return m ? m[1] : null;
};

const fmt = (s: number): string => {
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${sec < 10 ? '0' : ''}${sec}`;
};

const FALLBACK_URL = 'https://vimeo.com/315349787';

// ─────────────────────────────────────────────────────────────────────────────
// VIMEO HTML — NO external SDK. Uses Vimeo's native postMessage API.
// The iframe itself communicates via window.postMessage. We register event
// listeners by posting {method:'addEventListener',value:eventName} back to it.
// ─────────────────────────────────────────────────────────────────────────────
const buildVimeoHtml = (vimeoId: string): string => {
  const [id, hash] = vimeoId.split('/');
  const hashParam = hash ? `&h=${hash}` : '';
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;background:#000;overflow:hidden}
iframe{position:absolute;top:0;left:0;width:100%;height:100%;border:0}
</style>
</head>
<body>
<iframe id="vp"
  src="https://player.vimeo.com/video/${id}?autoplay=1&muted=0&loop=0&title=0&byline=0&portrait=0&badge=0&dnt=1&api=1&player_id=vp${hashParam}"
  allow="autoplay; fullscreen; picture-in-picture"
  allowfullscreen>
</iframe>
<script>
var iframe = document.getElementById('vp');
function sendRN(ev, d) {
  try {
    if (window.ReactNativeWebView)
      window.ReactNativeWebView.postMessage(JSON.stringify({ event: ev, data: d || {} }));
  } catch(e) {}
}
function registerEvents() {
  ['play','pause','finish','timeupdate'].forEach(function(ev) {
    iframe.contentWindow.postMessage(
      JSON.stringify({ method: 'addEventListener', value: ev }),
      'https://player.vimeo.com'
    );
  });
}
function setVimeoVolume(v) {
  iframe.contentWindow.postMessage(JSON.stringify({ method: 'setVolume', value: v }), 'https://player.vimeo.com');
}
window.addEventListener('message', function(e) {
  if (e.origin.indexOf('vimeo.com') === -1 && e.origin !== window.location.origin) return;
  var msg;
  try { msg = JSON.parse(e.data); } catch(ex) { return; }
  if (!msg || !msg.event) return;
  if (msg.event === 'ready') { registerEvents(); sendRN('ready'); return; }
  if (msg.event === 'play')  { sendRN('play'); return; }
  if (msg.event === 'pause') { sendRN('pause'); return; }
  if (msg.event === 'finish') { sendRN('finish'); return; }
  if (msg.event === 'timeupdate' && msg.data) {
    sendRN('timeupdate', { seconds: msg.data.seconds, duration: msg.data.duration, percent: msg.data.percent });
  }
});
// Fallback: fire registerEvents after 2 seconds in case ready event missed
setTimeout(registerEvents, 2000);
</script>
</body>
</html>`;
};

// ─────────────────────────────────────────────────────────────────────────────
// YOUTUBE HTML — YouTube IFrame API
// ─────────────────────────────────────────────────────────────────────────────
const buildYouTubeHtml = (ytId: string): string => `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;background:#000;overflow:hidden}
#player{width:100%;height:100%}
</style>
</head>
<body>
<div id="player"></div>
<script>
var tag=document.createElement('script');
tag.src='https://www.youtube.com/iframe_api';
document.head.appendChild(tag);
var yt;
function onYouTubeIframeAPIReady(){
  yt=new YT.Player('player',{
    width:'100%',height:'100%',videoId:'${ytId}',
    playerVars:{playsinline:1,autoplay:1,controls:1,rel:0,modestbranding:1},
    events:{
      onReady:function(){
        setInterval(function(){
          if(!yt||!yt.getCurrentTime)return;
          var c=yt.getCurrentTime(),d=yt.getDuration();
          if(window.ReactNativeWebView)
            window.ReactNativeWebView.postMessage(JSON.stringify({event:'timeupdate',data:{seconds:c,duration:d,percent:d>0?c/d:0}}));
        },1000);
      },
      onStateChange:function(e){
        var S=YT.PlayerState,ev=null;
        if(e.data===S.PLAYING)ev='play';
        else if(e.data===S.PAUSED)ev='pause';
        else if(e.data===S.ENDED)ev='finish';
        if(ev&&window.ReactNativeWebView)
          window.ReactNativeWebView.postMessage(JSON.stringify({event:ev,data:{}}));
      }
    }
  });
}
</script>
</body>
</html>`;

// ─────────────────────────────────────────────────────────────────────────────
// MP4 / DIRECT URL HTML — HTML5 video (best for Android WebView)
// ─────────────────────────────────────────────────────────────────────────────
const buildMp4Html = (url: string): string => `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;background:#000;overflow:hidden}
video{width:100%;height:100%;object-fit:contain;display:block}
</style>
</head>
<body>
<video id="v" src="${url}" autoplay playsinline controls></video>
<script>
var v=document.getElementById('v');
function rn(ev,d){
  if(window.ReactNativeWebView)
    window.ReactNativeWebView.postMessage(JSON.stringify({event:ev,data:d||{}}));
}
v.onplay=function(){rn('play');};
v.onpause=function(){rn('pause');};
v.onended=function(){rn('finish');};
v.ontimeupdate=function(){
  rn('timeupdate',{seconds:v.currentTime,duration:v.duration||0,percent:v.duration>0?v.currentTime/v.duration:0});
};
v.onerror=function(){rn('error',{msg:'video load error'});};
</script>
</body>
</html>`;

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
interface Props { courseId: string; lessonIndex: number; onBack: () => void; }

export const VideoPlayerScreen: React.FC<Props> = ({ courseId, lessonIndex, onBack }) => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const isDark = scheme === 'dark';

  // ── state ──────────────────────────────────────────────────────────────────
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentLesson, setCurrentLesson] = useState(lessonIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPurchased, setIsPurchased] = useState(false);
  const [previewLeft, setPreviewLeft] = useState(300);   // 5-min free preview
  const [previewExpired, setPreviewExpired] = useState(false);
  const [progress, setProgress] = useState(0);     // 0-100
  const [completed, setCompleted] = useState<number[]>([]);
  const [marking, setMarking] = useState(false);
  const [videoUri, setVideoUri] = useState(FALLBACK_URL);
  const [wvKey, setWvKey] = useState(0);     // force WebView remount
  const [isScreenLocked, setIsScreenLocked] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [vimeoVol, setVimeoVol] = useState(1);
  const webViewRef = useRef<any>(null);
  const videoViewRef = useRef<any>(null);
  const syncRef = useRef<any>(null);

  // expo-video hook — MUST be top-level (Rules of Hooks)
  const expoPlayer = useVideoPlayer
    ? useVideoPlayer(videoUri, (p: any) => {
      p.loop = false;
      p.play(); // Auto-play the video
    })
    : null;

  // ── syllabus ────────────────────────────────────────────────────────────────
  const syllabus = useMemo<string[]>(() => {
    if (!course) return [];
    if (Array.isArray(course.syllabus) && course.syllabus.length && typeof course.syllabus[0] === 'string')
      return course.syllabus as string[];
    if (course.modules?.length) {
      const out: string[] = [];
      course.modules.forEach(m => m.lessons?.forEach(l => out.push(l.title || `Lesson ${out.length + 1}`)));
      if (out.length) return out;
    }
    const al = (course as any).lessons;
    if (Array.isArray(al) && al.length) return al.map((l: any, i: number) => l.title || `Lesson ${i + 1}`);
    return Array.from({ length: course.lessonsCount || 5 }, (_, i) => `Lesson ${i + 1}`);
  }, [course]);

  // ── resolve video URL from Firestore course doc ─────────────────────────────
  const resolvedUrl = useMemo<string>(() => {
    if (!course) return FALLBACK_URL;
    // 1. modules → lessons
    if (course.modules?.length) {
      const all: any[] = [];
      course.modules.forEach(m => m.lessons?.length && all.push(...m.lessons));
      const l = all[currentLesson] ?? all[0];
      if (l?.videoUrl) return l.videoUrl;
      if (l?.url) return l.url;
    }
    // 2. course.lessons array
    const al = (course as any).lessons;
    if (Array.isArray(al) && al.length) {
      const l = al[currentLesson] ?? al[0];
      if (l?.videoUrl) return l.videoUrl;
      if (l?.url) return l.url;
    }
    // 3. videoUrls array
    const vu = (course as any).videoUrls;
    if (Array.isArray(vu) && vu.length) return vu[currentLesson] ?? vu[0] ?? FALLBACK_URL;
    // 4. top-level videoUrl field
    if ((course as any).videoUrl) return (course as any).videoUrl;
    // 5. syllabus objects with videoUrl
    const syl = (course as any).syllabus;
    if (Array.isArray(syl) && typeof syl[currentLesson] === 'object' && syl[currentLesson]?.videoUrl)
      return syl[currentLesson].videoUrl;
    return FALLBACK_URL;
  }, [course, currentLesson]);

  // ── access flags ───────────────────────────────────────────────────────────
  const isAdmin = user?.role === 'admin';
  const isFree = !!(course && (course.price === 0 || (course as any).isFree));
  const isEnrolled = !!(user && course?.enrolledUsers?.includes(user.uid));
  const hasAccess = isPurchased || isFree || isEnrolled || isAdmin;

  // ── video type detection ───────────────────────────────────────────────────
  const isVimeo = resolvedUrl.includes('vimeo.com');
  const isYouTube = resolvedUrl.includes('youtube.com') || resolvedUrl.includes('youtu.be');
  const vimeoId = isVimeo ? getVimeoId(resolvedUrl) : null;
  const ytId = isYouTube ? getYouTubeId(resolvedUrl) : null;
  const useWV = !!WebView && (isVimeo || isYouTube); // use WebView for embeds, expo-video for MP4

  // ── derived ────────────────────────────────────────────────────────────────
  const isFirst = currentLesson === 0;

  // ── handlers ──────────────────────────────────────────────────────────────
  const autoComplete = useCallback(async (pct: number) => {
    if (!user || !course || completed.includes(currentLesson)) return;
    const updated = [...completed, currentLesson];
    setCompleted(updated);
    await lmsService.updateCourseProgress(user.uid, course.id, currentLesson, pct, syllabus.length).catch(() => { });
  }, [user, course, completed, currentLesson, syllabus.length]);

  // ── expo-video progress tracking ──────────────────────────────────────────
  useEffect(() => {
    if (!expoPlayer || useWV) return;
    const interval = setInterval(() => {
      if (expoPlayer.playing) {
        setIsPlaying(true);
        const dur = expoPlayer.duration || 1;
        const cur = expoPlayer.currentTime || 0;
        const pct = Math.min(100, Math.max(0, Math.round((cur / dur) * 100)));
        setProgress(pct);

        if (!hasAccess && isFirst) {
          const left = Math.max(300 - Math.floor(cur), 0);
          setPreviewLeft(left);
          if (left <= 0) {
            setPreviewExpired(true);
            expoPlayer.pause();
            setIsPlaying(false);
          }
        }
        if (pct >= 90) autoComplete(pct);
      } else {
        setIsPlaying(false);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expoPlayer, useWV, hasAccess, isFirst, autoComplete]);

  // ── derived ────────────────────────────────────────────────────────────────
  const lessonTitle = syllabus[currentLesson] || `Lesson ${currentLesson + 1}`;
  const isLocked = !hasAccess && !isFirst;
  const showLock = isLocked || (previewExpired && !hasAccess);

  // ── Firestore realtime listeners ──────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    const unsubCourse = onSnapshot(
      doc(db, 'courses', courseId),
      snap => {
        if (snap.exists()) {
          const data = snap.data();
          console.log('[VideoPlayer] Course data keys:', Object.keys(data));
          console.log('[VideoPlayer] videoUrl:', data.videoUrl);
          console.log('[VideoPlayer] videoUrls:', data.videoUrls);
          console.log('[VideoPlayer] modules:', JSON.stringify(data.modules)?.slice(0, 300));
          console.log('[VideoPlayer] lessons:', JSON.stringify(data.lessons)?.slice(0, 300));
          setCourse({ id: snap.id, ...data } as Course);
        }
        setLoading(false);
      },
      async () => { setCourse(await courseService.getCourseById(courseId)); setLoading(false); }
    );
    let unsubUser: (() => void) | undefined;
    let unsubEnroll: (() => void) | undefined;
    if (user) {
      unsubUser = onSnapshot(doc(db, 'users', user.uid), snap => {
        if (!snap.exists()) return;
        const ud = snap.data();
        const ids = new Set<string>();
        ['enrolledCourses', 'purchasedCourses', 'courses'].forEach(f => {
          const v = ud[f];
          if (Array.isArray(v)) v.forEach((x: any) => {
            if (typeof x === 'string') ids.add(x);
            else if (x?.id) ids.add(x.id);
            else if (x?.courseId) ids.add(x.courseId);
          });
          else if (v && typeof v === 'object') Object.keys(v).forEach(k => v[k] && ids.add(k));
        });
        if (ud.seekerProfile) ['enrolledCourses', 'purchasedCourses'].forEach(f => {
          if (Array.isArray(ud.seekerProfile[f]))
            ud.seekerProfile[f].forEach((x: any) => {
              if (typeof x === 'string') ids.add(x); else if (x?.id) ids.add(x.id);
            });
        });
        if (ids.has(courseId)) setIsPurchased(true);
        setCompleted((ud.completedLessons || {})[courseId] || []);
      });
      unsubEnroll = onSnapshot(
        doc(db, 'enrollments', `${user.uid}_${courseId}`),
        snap => { if (snap.exists()) setIsPurchased(true); }
      );
    }
    return () => { unsubCourse(); unsubUser?.(); unsubEnroll?.(); };
  }, [courseId, user]);

  // ── sync video URL → state + WebView remount ─────────────────────────────
  useEffect(() => {
    console.log('[VideoPlayer] resolvedUrl =', resolvedUrl);
    console.log('[VideoPlayer] isVimeo=', resolvedUrl.includes('vimeo.com'), 'isYT=', resolvedUrl.includes('youtube'));
    setVideoUri(resolvedUrl);
    setWvKey(k => k + 1);
    setProgress(0);
    setIsPlaying(false);

    // For expo-video, we must explicitly replace the source when it changes
    if (expoPlayer) {
      expoPlayer.replaceAsync(resolvedUrl)
        .then(() => {
          expoPlayer.play();
        })
        .catch((err: any) => {
          console.warn('[VideoPlayer] replaceAsync failed:', err);
        });
    }
  }, [resolvedUrl]); // Do NOT add expoPlayer here, it causes infinite replace/reloads

  // ── 10-second progress sync to Firestore ──────────────────────────────────
  useEffect(() => {
    if (syncRef.current) clearInterval(syncRef.current);
    if (isPlaying && user && course) {
      syncRef.current = setInterval(() => {
        setProgress(p => {
          lmsService.updateCourseProgress(user.uid, course.id, currentLesson, p, syllabus.length)
            .catch(() => { });
          return p;
        });
      }, 10000);
    }
    return () => { if (syncRef.current) clearInterval(syncRef.current); };
  }, [isPlaying, user, course, currentLesson, syllabus.length]);

  // ── handlers ──────────────────────────────────────────────────────────────

  const markComplete = useCallback(async () => {
    if (!user || !course) return;
    setMarking(true);
    try {
      setProgress(100);
      const updated = completed.includes(currentLesson) ? completed : [...completed, currentLesson];
      setCompleted(updated);
      await lmsService.updateCourseProgress(user.uid, course.id, currentLesson, 100, syllabus.length);
      if (updated.length >= syllabus.length) {
        Alert.alert('🎉 Course Completed!', 'All lessons done! You can now take the final exam.', [
          { text: 'Later', style: 'cancel' },
          { text: 'Take Exam', onPress: onBack },
        ]);
      } else {
        Alert.alert('✅ Lesson Done!', `${updated.length}/${syllabus.length} lessons completed.`, [
          { text: 'Next', onPress: () => goToLesson(currentLesson + 1) },
          { text: 'OK', style: 'cancel' },
        ]);
      }
    } catch { Alert.alert('Error', 'Could not save progress.'); }
    finally { setMarking(false); }
  }, [user, course, completed, currentLesson, syllabus.length, onBack]);

  const goToLesson = useCallback((idx: number) => {
    if (idx < 0 || idx >= syllabus.length) return;
    setCurrentLesson(idx);
    setProgress(0);
    setPreviewExpired(false);
    setPreviewLeft(300);
    setIsPlaying(false);
    setWvKey(k => k + 1);
  }, [syllabus.length]);

  const toggleFullscreen = useCallback(async () => {
    setIsFullscreen(!isFullscreen);
    // Note: ScreenOrientation requires a new native build, so we just expand the UI for now.
  }, [isFullscreen]);

  const changeVolume = useCallback((delta: number) => {
    if (useWV) {
      const next = Math.max(0, Math.min(1, vimeoVol + delta));
      setVimeoVol(next);
      webViewRef.current?.injectJavaScript(`if(window.setVimeoVolume) window.setVimeoVolume(${next}); true;`);
    } else if (expoPlayer) {
      expoPlayer.volume = Math.max(0, Math.min(1, expoPlayer.volume + delta));
    }
  }, [useWV, vimeoVol, expoPlayer]);

  // WebView message handler — receives events from all 3 HTML embeds
  const onMsg = useCallback((e: any) => {
    try {
      const { event: ev, data } = JSON.parse(e.nativeEvent.data);
      if (ev === 'play') { setIsPlaying(true); }
      else if (ev === 'pause') { setIsPlaying(false); }
      else if (ev === 'finish') { setIsPlaying(false); markComplete(); }
      else if (ev === 'timeupdate') {
        const pct = Math.min(100, Math.max(0, Math.round((data?.percent ?? 0) * 100)));
        setProgress(pct);
        // Free preview check (only lesson 0 for non-enrolled)
        if (!hasAccess && isFirst) {
          const left = Math.max(300 - Math.floor(data?.seconds ?? 0), 0);
          setPreviewLeft(left);
          if (left <= 0) { setPreviewExpired(true); setIsPlaying(false); }
        }
        if (pct >= 90) autoComplete(pct);
      }
    } catch (_) { }
  }, [hasAccess, isFirst, markComplete, autoComplete]);

  // ── loading guard ─────────────────────────────────────────────────────────
  if (!course) {
    return (
      <View style={[st.center, { flex: 1, backgroundColor: colors.background }]}>
        {loading
          ? <ActivityIndicator size="large" color="#6C63FF" />
          : <>
            <Text style={{ color: colors.text, fontSize: 16, marginBottom: 16 }}>Course not found.</Text>
            <Button title="Go Back" onPress={onBack} />
          </>}
      </View>
    );
  }

  // ── theme ─────────────────────────────────────────────────────────────────
  const BG = isDark ? '#0D0D1A' : '#FFFFFF';
  const CARD = isDark ? '#161628' : '#F5F6FF';
  const BORDER = isDark ? '#252540' : '#E8EAFF';
  const TXT = isDark ? '#EEEEFF' : '#1A1040';
  const TXT2 = isDark ? '#8080AA' : '#6B6B8A';
  const ACCENT = '#6C63FF';
  const GREEN = '#10B981';

  // ── build HTML for current lesson ────────────────────────────────────────
  const playerHtml: string = isVimeo && vimeoId
    ? buildVimeoHtml(vimeoId)
    : isYouTube && ytId
      ? buildYouTubeHtml(ytId)
      : buildMp4Html(videoUri);

  return (
    <SafeAreaView style={[st.root, { backgroundColor: BG }]} edges={['top']}>

      {/* ─── Header ────────────────────────────────────────────────── */}
      <View style={[st.header, { backgroundColor: BG, borderBottomColor: BORDER }]}>
        <TouchableOpacity onPress={onBack} style={st.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={26} color={ACCENT} />
        </TouchableOpacity>
        <View style={st.headerMid}>
          <Text style={[st.headerTitle, { color: TXT }]} numberOfLines={1}>{lessonTitle}</Text>
          <Text style={[st.headerSub, { color: TXT2 }]} numberOfLines={1}>{course.title}</Text>
        </View>
        {hasAccess && (
          <View style={[st.accessBadge, { backgroundColor: GREEN + '22', borderColor: GREEN + '55' }]}>
            <Ionicons name="infinite" size={11} color={GREEN} />
            <Text style={[st.accessBadgeText, { color: GREEN }]}>Full Access</Text>
          </View>
        )}
      </View>

      {/* ─── Video Player ──────────────────────────────────────────── */}
      <View style={isFullscreen ? { position: 'absolute', top: 0, left: 0, bottom: 0, right: 0, zIndex: 9999, elevation: 9999, backgroundColor: '#000' } : st.playerBox}>
        {showLock ? (
          /* Lock overlay */
          <View style={st.lockWrap}>
            <View style={[st.lockCircle, { backgroundColor: ACCENT + '33' }]}>
              <Ionicons name={isLocked ? 'lock-closed' : 'time'} size={34} color="#fff" />
            </View>
            <Text style={st.lockTitle}>{isLocked ? 'Lesson Locked' : 'Preview Ended'}</Text>
            <Text style={st.lockMsg}>
              {isLocked
                ? 'Enroll to unlock all lessons and get full access.'
                : 'Your 5-minute free preview has ended. Enroll to continue.'}
            </Text>
            <TouchableOpacity style={[st.enrollCta, { backgroundColor: ACCENT }]} onPress={onBack}>
              <Text style={st.enrollCtaText}>Enroll Now →</Text>
            </TouchableOpacity>
          </View>
        ) : useWV ? (
          /* WebView player — works for Vimeo, YouTube, MP4 on Android */
          <>
            <WebView
              ref={webViewRef}
              key={`wv-${courseId}-${currentLesson}-${wvKey}`}
              style={{ flex: 1, backgroundColor: '#000' }}
              javaScriptEnabled
              domStorageEnabled
              allowsFullscreenVideo
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              mixedContentMode="always"
              originWhitelist={['*']}
              onMessage={onMsg}
              onLoadStart={() => console.log('[VideoPlayer] WebView loadStart')}
              onLoadEnd={() => console.log('[VideoPlayer] WebView loadEnd, resolvedUrl=', resolvedUrl, 'isVimeo=', isVimeo, 'isYT=', isYouTube)}
              onError={(e: any) => console.warn('[VideoPlayer] WebView ERROR:', JSON.stringify(e.nativeEvent))}
              onHttpError={(e: any) => console.warn('[VideoPlayer] WebView HTTP ERROR:', e.nativeEvent.statusCode, e.nativeEvent.url)}
              source={{ html: playerHtml, baseUrl: 'https://www.google.com' }}
            />
            {/* Preview countdown badge */}
            {!hasAccess && isFirst && !previewExpired && (
              <View style={st.previewBadge}>
                <Ionicons name="time-outline" size={11} color="#fff" />
                <Text style={st.previewBadgeText}>Preview: {fmt(previewLeft)}</Text>
              </View>
            )}
          </>
        ) : VideoView && expoPlayer ? (
          /* expo-video fallback (Expo Go, MP4 only) */
          <View style={{ flex: 1 }}>
            <VideoView
              ref={videoViewRef}
              player={expoPlayer}
              style={{ flex: 1 }}
              contentFit="contain"
              allowsFullscreen
              nativeControls={!isScreenLocked}
            />
          </View>
        ) : (

          /* No player available */
          <View style={st.noPlayer}>
            <Ionicons name="play-circle-outline" size={52} color={ACCENT} />
            <Text style={st.noPlayerText}>Use a dev build to play videos</Text>
          </View>
        )}

        {/* Progress bar at bottom of player */}
        {!showLock && (
          <View style={st.progressBar}>
            <View style={[st.progressFill, { width: `${progress}%` as any, backgroundColor: ACCENT }]} />
          </View>
        )}

        {/* Custom Controls Overlay (Applies to both MP4 and Vimeo) */}
        {!showLock && (
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {/* Lock Screen Touch Interceptor */}
            {isScreenLocked && (
              <TouchableOpacity
                style={StyleSheet.absoluteFill}
                activeOpacity={1}
                onPress={() => { /* consume touch to prevent interacting with video */ }}
              />
            )}

            {/* Lock Button (Top Left) */}
            <TouchableOpacity
              style={{ position: 'absolute', top: 12, left: 12, padding: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, zIndex: 10 }}
              onPress={() => setIsScreenLocked(!isScreenLocked)}
            >
              <Ionicons name={isScreenLocked ? "lock-closed" : "lock-open"} size={20} color="#fff" />
            </TouchableOpacity>

            {/* Volume & Fullscreen (Top Right) - Universal */}
            {!isScreenLocked && (
              <View style={{ position: 'absolute', top: 12, right: 12, flexDirection: 'row', gap: 8, zIndex: 10 }}>
                <TouchableOpacity
                  style={{ padding: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 }}
                  onPress={() => changeVolume(-0.1)}
                >
                  <Ionicons name="volume-low" size={20} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ padding: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 }}
                  onPress={() => changeVolume(0.1)}
                >
                  <Ionicons name="volume-high" size={20} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ padding: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 }}
                  onPress={toggleFullscreen}
                >
                  <Ionicons name={isFullscreen ? "contract" : "expand"} size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>

      {/* ─── Lesson info + Mark Done ────────────────────────────────── */}
      <View style={[st.infoRow, { backgroundColor: CARD, borderBottomColor: BORDER }]}>
        <View style={{ flex: 1 }}>
          <Text style={[st.infoTitle, { color: TXT }]} numberOfLines={2}>{lessonTitle}</Text>
          <Text style={[st.infoSub, { color: TXT2 }]}>
            {currentLesson + 1} / {syllabus.length} lessons  ·  {Math.round(progress)}% watched
          </Text>
        </View>
        {(hasAccess || isAdmin) && !showLock && (
          <TouchableOpacity
            style={[st.markBtn, { backgroundColor: completed.includes(currentLesson) ? GREEN : ACCENT }]}
            onPress={markComplete}
            disabled={completed.includes(currentLesson) || marking}
          >
            {marking
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name={completed.includes(currentLesson) ? 'checkmark-circle' : 'checkmark-circle-outline'} size={15} color="#fff" />
            }
            <Text style={st.markBtnText}>{completed.includes(currentLesson) ? 'Done' : 'Mark Done'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ─── Prev / Next navigation ─────────────────────────────────── */}
      <View style={[st.navRow, { backgroundColor: BG, borderBottomColor: BORDER }]}>
        <TouchableOpacity
          style={[st.navBtn, { backgroundColor: CARD, borderColor: BORDER, opacity: currentLesson === 0 ? 0.35 : 1 }]}
          onPress={() => goToLesson(currentLesson - 1)}
          disabled={currentLesson === 0}
        >
          <Ionicons name="chevron-back" size={17} color={ACCENT} />
          <Text style={[st.navBtnText, { color: ACCENT }]}>Prev</Text>
        </TouchableOpacity>

        <Text style={[st.navMid, { color: TXT2 }]}>
          {completed.length}/{syllabus.length} done
        </Text>

        <TouchableOpacity
          style={[st.navBtn, { backgroundColor: CARD, borderColor: BORDER, opacity: currentLesson >= syllabus.length - 1 ? 0.35 : 1 }]}
          onPress={() => goToLesson(currentLesson + 1)}
          disabled={currentLesson >= syllabus.length - 1}
        >
          <Text style={[st.navBtnText, { color: ACCENT }]}>Next</Text>
          <Ionicons name="chevron-forward" size={17} color={ACCENT} />
        </TouchableOpacity>
      </View>

      {/* ─── Syllabus list ──────────────────────────────────────────── */}
      <ScrollView
        style={{ flex: 1, backgroundColor: BG }}
        contentContainerStyle={{ padding: 14, paddingBottom: 20 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[st.sylLabel, { color: TXT2 }]}>COURSE LESSONS</Text>
        {syllabus.map((item, idx) => {
          const active = idx === currentLesson;
          const done = completed.includes(idx);
          const locked = !hasAccess && idx > 0;
          return (
            <TouchableOpacity
              key={idx}
              style={[st.lessonRow,
              { backgroundColor: active ? ACCENT + '18' : CARD, borderColor: active ? ACCENT : BORDER }
              ]}
              onPress={() => locked
                ? Alert.alert('🔒 Locked', 'Enroll in this course to watch all lessons.')
                : goToLesson(idx)
              }
              activeOpacity={0.75}
            >
              <View style={[st.lessonNum,
              { backgroundColor: done ? GREEN : active ? ACCENT : BORDER }
              ]}>
                {done
                  ? <Ionicons name="checkmark" size={12} color="#fff" />
                  : locked
                    ? <Ionicons name="lock-closed" size={10} color={TXT2} />
                    : <Text style={[st.lessonNumText, { color: active ? '#fff' : TXT2 }]}>{idx + 1}</Text>
                }
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[st.lessonTitle,
                { color: locked ? TXT2 : TXT, fontWeight: active ? '700' : '500' }
                ]} numberOfLines={2}>{item}</Text>
                {active && <Text style={[st.nowPlaying, { color: ACCENT }]}>▶ Now Playing</Text>}
              </View>
              {active && <Ionicons name="play-circle" size={20} color={ACCENT} />}
              {done && !active && <Ionicons name="checkmark-circle" size={18} color={GREEN} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  root: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  // header
  header: { flexDirection: 'row', alignItems: 'center', height: 56, paddingHorizontal: 12, borderBottomWidth: 1, gap: 8 },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', borderRadius: 18 },
  headerMid: { flex: 1 },
  headerTitle: { fontSize: 14, fontWeight: '700', lineHeight: 18 },
  headerSub: { fontSize: 11, lineHeight: 14, marginTop: 1 },
  accessBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 20, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
  accessBadgeText: { fontSize: 9, fontWeight: '800' },
  // player
  playerBox: { height: 240, backgroundColor: '#000', position: 'relative' },
  progressBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, backgroundColor: 'rgba(255,255,255,0.12)' },
  progressFill: { height: 3 },
  previewBadge: { position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(239,68,68,0.88)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  previewBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  // lock
  lockWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28, backgroundColor: 'rgba(0,0,0,0.92)' },
  lockCircle: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  lockTitle: { color: '#fff', fontSize: 17, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  lockMsg: { color: '#AAAACC', fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  enrollCta: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24 },
  enrollCtaText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  // no player
  noPlayer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  noPlayerText: { color: '#8080AA', fontSize: 13, textAlign: 'center' },
  // info row
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, gap: 10 },
  infoTitle: { fontSize: 13, fontWeight: '700', lineHeight: 19 },
  infoSub: { fontSize: 11, marginTop: 2 },
  markBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  markBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  // nav row
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 7, borderBottomWidth: 1 },
  navBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  navBtnText: { fontSize: 12, fontWeight: '600' },
  navMid: { fontSize: 11, fontWeight: '600' },
  // syllabus
  sylLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 10 },
  lessonRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 7 },
  lessonNum: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  lessonNumText: { fontSize: 11, fontWeight: '700' },
  lessonTitle: { fontSize: 13, lineHeight: 18 },
  nowPlaying: { fontSize: 10, fontWeight: '600', marginTop: 2 },
});
