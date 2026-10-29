import os

jsx_file = os.path.join(os.path.dirname(__file__), '..', '..', 'frontend', 'src', 'pages', 'UserDashboard.jsx')
with open(jsx_file, 'r', encoding='utf-8') as f:
    code = f.read()

code_norm = code.replace('\r\n', '\n')

old_card1_and_3 = '''        {/* Card 1: Slate/Dark (Speed & Ingress Traffic) */}
        <StatCard
          icon={Zap}
          color="#10201E"
          bg="#F1F5F3"
          borderColor="#D9E1DC"
          value={data?.requests_today || 0}
          label="24h Ingress Requests"
          sublabel="Real-Time Traffic Velocity"
          badgeText="LIVE INGRESS"
          badgeType="emerald"
          onClean={() => handleCleanCategory('requests_today', '24h Ingress')}
          cleaning={cleaningCategory === 'requests_today'}
          actionText="Inspect Ingress Traffic"
          actionLink="/user/logs"
          actionColor="#10201E"
        />

        {/* Card 2: Security Crimson (Attacks Blocked & Quarantined) */}
        <StatCard
          icon={ShieldAlert}
          color="#DC2626"
          bg="#FEF2F2"
          borderColor="#FECACA"
          value={data?.total_blocked || 0}
          label="Attacks Quarantined"
          sublabel="403 Forbidden Intercepted"
          badgeText="QUARANTINED"
          badgeType="crimson"
          onClean={() => handleCleanCategory('total_blocked', 'Attacks Blocked')}
          cleaning={cleaningCategory === 'total_blocked'}
          actionText="Inspect Threat Forensics"
          actionLink="/user/logs"
          actionColor="#DC2626"
        />

        {/* Card 3: Brand Amber / Orange (Neural Engine & Heuristic Inspection) */}
        <StatCard
          icon={Sparkles}
          color="#E8792F"
          bg="#FFF4ED"
          borderColor="#FCD3B6"
          value={data?.total_requests || 0}
          label="Lifetime Scrubbed Edge"
          sublabel="6.5M+ Neural Model Heuristics"
          badgeText="NEURAL ENGINE"
          badgeType="orange"
          onClean={() => handleCleanCategory('total_requests', 'Lifetime Traffic')}
          cleaning={cleaningCategory === 'total_requests'}
          actionText="View AI Threat Model"
          actionLink="/user/rules"
          actionColor="#E8792F"
        />'''

new_card1_and_3 = '''        {/* Card 1: Slate/Dark (24h Blocked Threats) */}
        <StatCard
          icon={ShieldAlert}
          color="#10201E"
          bg="#F1F5F3"
          borderColor="#D9E1DC"
          value={data?.blocked_today || 0}
          label="24h Blocked Threats"
          sublabel="Real-Time Attack Neutralization"
          badgeText="ACTIVE SHIELD"
          badgeType="emerald"
          onClean={() => handleCleanCategory('blocked_today', '24h Blocked')}
          cleaning={cleaningCategory === 'blocked_today'}
          actionText="Inspect Threat Logs"
          actionLink="/user/logs"
          actionColor="#10201E"
        />

        {/* Card 2: Security Crimson (Attacks Blocked & Quarantined) */}
        <StatCard
          icon={ShieldAlert}
          color="#DC2626"
          bg="#FEF2F2"
          borderColor="#FECACA"
          value={data?.total_blocked || 0}
          label="Attacks Quarantined"
          sublabel="403 Forbidden Intercepted"
          badgeText="QUARANTINED"
          badgeType="crimson"
          onClean={() => handleCleanCategory('total_blocked', 'Attacks Blocked')}
          cleaning={cleaningCategory === 'total_blocked'}
          actionText="Inspect Threat Forensics"
          actionLink="/user/logs"
          actionColor="#DC2626"
        />

        {/* Card 3: Brand Amber / Orange (Neural Threat Signatures) */}
        <StatCard
          icon={Sparkles}
          color="#E8792F"
          bg="#FFF4ED"
          borderColor="#FCD3B6"
          value={data?.total_blocked || 0}
          label="All-Time Quarantined"
          sublabel="6.5M+ Neural Threat Signatures"
          badgeText="NEURAL SHIELD"
          badgeType="orange"
          onClean={() => handleCleanCategory('total_blocked', 'Lifetime Threats')}
          cleaning={cleaningCategory === 'total_blocked'}
          actionText="View Threat Intel"
          actionLink="/user/rules"
          actionColor="#E8792F"
        />'''

if old_card1_and_3 in code_norm:
    code_norm = code_norm.replace(old_card1_and_3, new_card1_and_3)
    with open(jsx_file, 'w', encoding='utf-8') as f:
        f.write(code_norm)
    print("SUCCESS: UserDashboard.jsx patched successfully")
else:
    print("FAILED: old_card1_and_3 pattern not found in UserDashboard.jsx")

