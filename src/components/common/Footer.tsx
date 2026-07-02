import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';

const LinkCol = ({ title, links }: { title: string, links: string[] }) => (
  <View style={styles.col}>
    <Text style={styles.colTitle}>{title}</Text>
    {links.map((link, idx) => (
      <TouchableOpacity key={idx} style={styles.linkBtn}>
        <Text style={styles.linkText}>{link}</Text>
      </TouchableOpacity>
    ))}
  </View>
);

export const Footer: React.FC = () => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  return (
    <View style={styles.container}>
      <View style={[styles.content, isMobile && styles.contentMobile]}>
        {/* Brand Column */}
        <View style={[styles.brandCol, isMobile && styles.brandColMobile]}>
          <View style={styles.logoRow}>
            <Text style={styles.logoIcon}>💼</Text>
            <View>
              <Text style={styles.logoName}>JobSkill</Text>
              <Text style={styles.logoTagline}>Find Your Dream Career</Text>
            </View>
          </View>
          <Text style={styles.brandDesc}>
            Connecting talented professionals with amazing opportunities across India.
          </Text>
          <View style={styles.contactInfo}>
            <Text style={styles.contactText}>📍 Chh Sambhaji Nagar, India</Text>
            <Text style={styles.contactText}>✉️ support@icodedjobs.com</Text>
          </View>
        </View>

        {/* Links Grid */}
        <View style={[styles.linksGrid, isMobile && styles.linksGridMobile]}>
          <LinkCol 
            title="For Job Seekers" 
            links={['Browse Jobs', 'Companies', 'Career Resources', 'Resume Builder']} 
          />
          <LinkCol 
            title="For Employers" 
            links={['Post a Job', 'Browse Resumes', 'Recruitment Solutions', 'Pricing']} 
          />
          <LinkCol 
            title="Company" 
            links={['About Us', 'Contact', 'Privacy Policy', 'Terms & Conditions']} 
          />
          <LinkCol 
            title="Legal" 
            links={['Shipping & Delivery', 'Cancellation & Refund', 'Platform Disclaimer']} 
          />
        </View>
      </View>

      <View style={styles.divider} />

      {/* Bottom Bar */}
      <View style={[styles.bottomBar, isMobile && styles.bottomBarMobile]}>
        <Text style={styles.copyright}>© 2026 JobSkill. All rights reserved.</Text>
        
        <View style={styles.socialRow}>
          <TouchableOpacity style={styles.socialBtn}><Text style={styles.socialIcon}>f</Text></TouchableOpacity>
          <TouchableOpacity style={styles.socialBtn}><Text style={styles.socialIcon}>in</Text></TouchableOpacity>
          <TouchableOpacity style={styles.socialBtn}><Text style={styles.socialIcon}>𝕏</Text></TouchableOpacity>
        </View>

        <View style={styles.bottomLinks}>
          <Text style={styles.bottomLinkText}>Privacy</Text>
          <Text style={styles.bottomLinkDot}>•</Text>
          <Text style={styles.bottomLinkText}>Terms</Text>
          <Text style={styles.bottomLinkDot}>•</Text>
          <Text style={styles.bottomLinkText}>Disclaimer</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0A1128', // Dark Navy
    paddingTop: 64,
    paddingBottom: 24,
    paddingHorizontal: 24,
    width: '100%',
  },
  content: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 40,
    marginBottom: 48,
  },
  contentMobile: {
    flexDirection: 'column',
    gap: 32,
  },
  brandCol: {
    flex: 1,
    maxWidth: 320,
  },
  brandColMobile: {
    maxWidth: '100%',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  logoIcon: {
    fontSize: 32,
    backgroundColor: '#fff',
    padding: 4,
    borderRadius: 8,
  },
  logoName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
  logoTagline: {
    fontSize: 12,
    color: '#94A3B8',
  },
  brandDesc: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 24,
  },
  contactInfo: {
    gap: 12,
  },
  contactText: {
    color: '#CBD5E1',
    fontSize: 13,
  },
  linksGrid: {
    flex: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 24,
  },
  linksGridMobile: {
    flexDirection: 'column',
  },
  col: {
    flex: 1,
    minWidth: 140,
    marginBottom: 24,
  },
  colTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 20,
  },
  linkBtn: {
    marginBottom: 14,
  },
  linkText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: '#1E293B',
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    marginBottom: 24,
  },
  bottomBar: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomBarMobile: {
    flexDirection: 'column',
    gap: 16,
    alignItems: 'center',
  },
  copyright: {
    color: '#64748B',
    fontSize: 13,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 12,
  },
  socialBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialIcon: {
    color: '#CBD5E1',
    fontSize: 14,
    fontWeight: 'bold',
  },
  bottomLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bottomLinkText: {
    color: '#64748B',
    fontSize: 13,
  },
  bottomLinkDot: {
    color: '#334155',
    fontSize: 13,
  },
});
