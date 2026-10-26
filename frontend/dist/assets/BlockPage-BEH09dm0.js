import{i as e,n as t,t as n}from"./jsx-runtime-BKllkxft.js";import{A as r,S as i,r as a}from"./index-CAn0pg9L.js";import{t as o}from"./theme-BKyvQde1.js";var s=e(t(),1),c=n();function l(){let{dark:e}=i(),t=o(e),[n]=r(),l=n.get(`attack_type`)||`Suspicious Activity Detected`,u=n.get(`client_ip`)||`127.0.0.1`,d=n.get(`real_ip`)||u,f=n.get(`reason`)||`Request blocked by security rules`,p=n.get(`timestamp`)||new Date().toISOString().replace(`T`,` `).slice(0,19),m=n.get(`reference_id`)||`REF-`+Math.random().toString(36).substr(2,8).toUpperCase(),h=n.get(`url`)||window.location.pathname,[g,_]=(0,s.useState)(!1),[v,y]=(0,s.useState)(``),[b,x]=(0,s.useState)(``),[S,C]=(0,s.useState)(!1),[w,T]=(0,s.useState)(!1),[E,D]=(0,s.useState)(``);return(0,c.jsxs)(`div`,{style:{minHeight:`100vh`,display:`flex`,alignItems:`center`,justifyContent:`center`,padding:`24px`,margin:0,position:`relative`,background:t.bg,fontFamily:`'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`},children:[(0,c.jsx)(`style`,{children:`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body::before { 
          content: ''; position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: radial-gradient(ellipse at 50% 0%, ${e?`rgba(220,38,38,0.15)`:`rgba(220,38,38,0.08)`} 0%, transparent 70%);
          pointer-events: none; z-index: 0; 
        }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulseAlert { 0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); } 70% { box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); } 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }
        .block-wrapper { width: 100%; max-width: 600px; animation: slideUp 0.5s cubic-bezier(0.16,1,0.3,1); position: relative; z-index: 1; }
        .block-card { 
          background: ${t.bgCard}; border-radius: 16px; padding: 0; 
          box-shadow: ${e?`0 20px 40px rgba(0,0,0,0.5)`:`0 20px 40px rgba(0,0,0,0.1)`}; 
          border: 1px solid ${e?`rgba(239,68,68,0.3)`:`rgba(239,68,68,0.2)`}; 
          overflow: hidden; 
        }
        .status-bar { 
          display: flex; align-items: center; justify-content: space-between; 
          padding: 16px 24px; background: rgba(239, 68, 68, 0.1); 
          border-bottom: 1px solid rgba(239, 68, 68, 0.2);
        }
        .status-indicator { display: flex; align-items: center; gap: 10px; }
        .status-dot { width: 10px; height: 10px; background: #ef4444; border-radius: 50%; animation: pulseAlert 2s infinite; }
        .status-label { font-size: 13px; font-weight: 700; color: #ef4444; letter-spacing: 1px; text-transform: uppercase; }
        .ref-badge { font-size: 12px; color: ${t.textMuted}; font-family: 'Fira Code', monospace; }
        .block-content { padding: 40px 32px; text-align: center; }
        .block-icon { 
          width: 64px; height: 64px; background: rgba(239, 68, 68, 0.1); 
          border-radius: 50%; display: flex; align-items: center; justify-content: center; 
          margin: 0 auto 24px; color: #ef4444; font-size: 28px;
        }
        .block-title { font-size: 28px; font-weight: 800; color: ${t.text}; letter-spacing: -0.5px; margin-bottom: 12px; }
        .block-subtitle { font-size: 15px; color: ${t.textSecondary}; line-height: 1.6; margin-bottom: 32px; }
        .details-grid { 
          background: ${e?`rgba(0,0,0,0.2)`:`rgba(0,0,0,0.02)`}; 
          border-radius: 12px; padding: 24px; border: 1px solid ${t.borderLight}; 
          text-align: left; margin-bottom: 32px;
        }
        .detail-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .detail-row:last-child { margin-bottom: 0; }
        .detail-label { font-size: 13px; font-weight: 600; color: ${t.textMuted}; text-transform: uppercase; letter-spacing: 0.5px; }
        .detail-value { font-size: 14px; color: ${t.text}; font-weight: 500; text-align: right; }
        .detail-value.mono { font-family: 'Fira Code', monospace; }
        .detail-value.highlight { color: #ef4444; font-weight: 700; }
        .block-actions { display: flex; gap: 16px; justify-content: center; }
        .btn { 
          padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; 
          cursor: pointer; transition: all 0.2s; text-decoration: none; border: none; 
          display: inline-flex; align-items: center; gap: 8px;
        }
        .btn-primary { background: #ef4444; color: #fff; }
        .btn-primary:hover { background: #dc2626; transform: translateY(-1px); }
        .btn-secondary { background: transparent; color: ${t.text}; border: 1px solid ${t.border}; }
        .btn-secondary:hover { background: ${e?`rgba(255,255,255,0.05)`:`rgba(0,0,0,0.05)`}; }

        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.75); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; }
        .modal-box { background: ${t.bgCard}; border: 1px solid ${t.border}; border-radius: 16px; padding: 28px; width: 100%; max-width: 500px; box-shadow: 0 20px 40px rgba(0,0,0,0.4); text-align: left; }
        .modal-input { width: 100%; padding: 10px 14px; border-radius: 8px; border: 1px solid ${t.border}; background: ${e?`rgba(0,0,0,0.3)`:`rgba(255,255,255,0.9)`}; color: ${t.text}; font-size: 14px; margin-bottom: 14px; box-sizing: border-box; }
        .modal-input:focus { outline: none; border-color: #ef4444; }

        @media (max-width: 600px) {
          .block-content { padding: 32px 20px; }
          .detail-row { flex-direction: column; align-items: flex-start; gap: 4px; }
          .detail-value { text-align: left; }
          .block-actions { flex-direction: column; }
          .btn { width: 100%; justify-content: center; }
        }
      `}),(0,c.jsx)(`div`,{className:`block-wrapper`,children:(0,c.jsxs)(`div`,{className:`block-card`,children:[(0,c.jsxs)(`div`,{className:`status-bar`,children:[(0,c.jsxs)(`div`,{className:`status-indicator`,children:[(0,c.jsx)(`span`,{className:`status-dot`}),(0,c.jsx)(`span`,{className:`status-label`,children:`Access Denied`})]}),(0,c.jsxs)(`div`,{className:`ref-badge`,children:[`ID: `,m]})]}),(0,c.jsxs)(`div`,{className:`block-content`,children:[(0,c.jsx)(`div`,{className:`block-icon`,children:(0,c.jsx)(`i`,{className:`fas fa-shield-virus`})}),(0,c.jsx)(`h1`,{className:`block-title`,children:`Request Blocked`}),(0,c.jsx)(`p`,{className:`block-subtitle`,children:`Our Web Application Firewall has intercepted this request due to suspicious activity matching known threat signatures.`}),(0,c.jsxs)(`div`,{className:`details-grid`,children:[(0,c.jsxs)(`div`,{className:`detail-row`,children:[(0,c.jsx)(`span`,{className:`detail-label`,children:`Threat Type`}),(0,c.jsx)(`span`,{className:`detail-value highlight`,children:l})]}),(0,c.jsxs)(`div`,{className:`detail-row`,children:[(0,c.jsx)(`span`,{className:`detail-label`,children:`Client IP`}),(0,c.jsx)(`span`,{className:`detail-value mono`,children:u})]}),(0,c.jsxs)(`div`,{className:`detail-row`,children:[(0,c.jsx)(`span`,{className:`detail-label`,children:`Rule Triggered`}),(0,c.jsx)(`span`,{className:`detail-value`,children:f})]}),(0,c.jsxs)(`div`,{className:`detail-row`,children:[(0,c.jsx)(`span`,{className:`detail-label`,children:`Timestamp (UTC)`}),(0,c.jsx)(`span`,{className:`detail-value mono`,children:p})]})]}),(0,c.jsxs)(`div`,{className:`block-actions`,children:[(0,c.jsxs)(`button`,{className:`btn btn-primary`,onClick:()=>window.location.href=`/`,children:[(0,c.jsx)(`i`,{className:`fas fa-arrow-left`}),` Return Home`]}),(0,c.jsxs)(`button`,{className:`btn btn-secondary`,onClick:()=>_(!0),children:[(0,c.jsx)(`i`,{className:`fas fa-flag`}),` Report False Positive`]})]})]}),(0,c.jsx)(`div`,{style:{padding:`16px`,textAlign:`center`,borderTop:`1px solid ${t.borderLight}`,background:e?`rgba(0,0,0,0.2)`:`rgba(0,0,0,0.02)`},children:(0,c.jsxs)(`span`,{style:{fontSize:12,color:t.textMuted},children:[`Protected by `,(0,c.jsx)(`strong`,{style:{color:t.text},children:`MDefender Pro`}),` Enterprise WAF`]})})]})}),g&&(0,c.jsx)(`div`,{className:`modal-overlay`,onClick:()=>_(!1),children:(0,c.jsxs)(`div`,{className:`modal-box`,onClick:e=>e.stopPropagation(),children:[(0,c.jsxs)(`div`,{style:{display:`flex`,justifyContent:`space-between`,alignItems:`center`,marginBottom:`16px`},children:[(0,c.jsxs)(`h3`,{style:{margin:0,display:`flex`,alignItems:`center`,gap:`8px`,color:`#ef4444`},children:[(0,c.jsx)(`i`,{className:`fas fa-flag`}),` Report False Positive`]}),(0,c.jsx)(`button`,{style:{background:`transparent`,border:`none`,color:t.textMuted,fontSize:`18px`,cursor:`pointer`},onClick:()=>_(!1),children:`×`})]}),w?(0,c.jsxs)(`div`,{style:{textAlign:`center`,padding:`24px 0`},children:[(0,c.jsx)(`div`,{style:{width:`56px`,height:`56px`,borderRadius:`50%`,background:`rgba(34,197,94,0.15)`,color:`#22c55e`,fontSize:`24px`,display:`flex`,alignItems:`center`,justifyContent:`center`,margin:`0 auto 16px`},children:(0,c.jsx)(`i`,{className:`fas fa-check`})}),(0,c.jsx)(`h3`,{style:{margin:`0 0 8px 0`},children:`Report Submitted!`}),(0,c.jsxs)(`p`,{style:{fontSize:`14px`,color:t.textMuted,margin:`0 0 20px 0`},children:[`Reference ID `,(0,c.jsx)(`strong`,{children:m}),` has been logged to the Security Operations Center. Our security team will review and whitelist this pattern.`]}),(0,c.jsx)(`button`,{className:`btn btn-primary`,onClick:()=>_(!1),children:`Close`})]}):(0,c.jsxs)(`form`,{onSubmit:async e=>{e.preventDefault(),C(!0),D(``);try{await a.reportFalsePositive({reference_id:m,client_ip:d,url:h,payload:window.location.search||h,attack_type:l,reason:f,user_email:v,comments:b}),T(!0)}catch(e){D(e.message||`Failed to submit report. Please email security@example.com.`)}finally{C(!1)}},children:[(0,c.jsx)(`p`,{style:{fontSize:`13px`,color:t.textMuted,marginBottom:`16px`},children:`If your legitimate request was incorrectly blocked by the firewall, submit this form and our administrators can whitelist it with 1 click.`}),E&&(0,c.jsx)(`div`,{style:{padding:`10px 14px`,borderRadius:`8px`,background:`rgba(239,68,68,0.15)`,color:`#ef4444`,fontSize:`13px`,marginBottom:`14px`},children:E}),(0,c.jsx)(`div`,{style:{marginBottom:`6px`,fontSize:`12px`,fontWeight:600,color:t.textSecondary},children:`Reference ID`}),(0,c.jsx)(`input`,{type:`text`,className:`modal-input`,value:m,disabled:!0,style:{opacity:.7}}),(0,c.jsx)(`div`,{style:{marginBottom:`6px`,fontSize:`12px`,fontWeight:600,color:t.textSecondary},children:`Your Email (Optional)`}),(0,c.jsx)(`input`,{type:`email`,className:`modal-input`,placeholder:`your.email@example.com`,value:v,onChange:e=>y(e.target.value)}),(0,c.jsx)(`div`,{style:{marginBottom:`6px`,fontSize:`12px`,fontWeight:600,color:t.textSecondary},children:`Describe what you were doing`}),(0,c.jsx)(`textarea`,{rows:3,className:`modal-input`,placeholder:`e.g. I was saving an article containing HTML code...`,value:b,onChange:e=>x(e.target.value),style:{resize:`vertical`}}),(0,c.jsxs)(`div`,{style:{display:`flex`,justifyContent:`flex-end`,gap:`10px`,marginTop:`16px`},children:[(0,c.jsx)(`button`,{type:`button`,className:`btn btn-secondary`,onClick:()=>_(!1),children:`Cancel`}),(0,c.jsxs)(`button`,{type:`submit`,className:`btn btn-primary`,disabled:S,children:[(0,c.jsx)(`i`,{className:`fas ${S?`fa-spinner fa-spin`:`fa-paper-plane`}`}),S?`Submitting...`:`Submit to SOC`]})]})]})]})})]})}export{l as default};