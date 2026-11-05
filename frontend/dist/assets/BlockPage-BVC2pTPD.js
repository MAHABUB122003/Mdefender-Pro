import{i as e,n as t,t as n}from"./jsx-runtime-BKllkxft.js";import{A as r,r as i}from"./index-mt7ukSP0.js";var a=e(t(),1),o=n();function s(){let[e]=r(),t=e.get(`attack_type`)||`Cross-Site Scripting (XSS)`,n=e.get(`client_ip`)||`103.120.45.241`,s=e.get(`real_ip`)||n,c=e.get(`reason`)||`Request blocked by active security rule (Pattern Match)`,l=e.get(`timestamp`)||new Date().toISOString().replace(`T`,` `).slice(0,19)+` UTC`,u=e.get(`reference_id`)||`MDEF-`+Math.random().toString(36).substr(2,8).toUpperCase(),d=e.get(`url`)||window.location.pathname,f=e.get(`host`)||window.location.hostname||`mahabubur.shop`,[p,m]=(0,a.useState)(!1),[h,g]=(0,a.useState)(``),[_,v]=(0,a.useState)(``),[y,b]=(0,a.useState)(!1),[x,S]=(0,a.useState)(!1),[C,w]=(0,a.useState)(``),[T,E]=(0,a.useState)(!1);return(0,o.jsxs)(`div`,{className:`cf-block-page-root`,children:[(0,o.jsx)(`style`,{children:`
        .cf-block-page-root {
          min-height: 100vh;
          width: 100%;
          background-color: #ffffff;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: #1e293b;
          margin: 0;
          padding: 28px 0;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          position: relative;
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        .cf-top-pattern {
          position: absolute;
          top: 0;
          right: 0;
          width: 220px;
          height: 140px;
          background-image: radial-gradient(#cbd5e1 1.2px, transparent 1.2px);
          background-size: 14px 14px;
          opacity: 0.65;
          pointer-events: none;
          z-index: 0;
        }

        .cf-page-container {
          width: 100%;
          position: relative;
          z-index: 1;
        }

        /* Top 2 Columns */
        .cf-top-columns-wrap {
          max-width: 940px;
          margin: 0 auto 24px auto;
          padding: 0 24px;
          box-sizing: border-box;
        }

        .cf-top-columns-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 48px;
          text-align: left;
        }

        .cf-col-heading {
          font-size: 16px;
          font-weight: 700;
          color: #111827;
          margin-bottom: 8px;
          line-height: 1.3;
        }

        .cf-col-text {
          font-size: 13.5px;
          line-height: 1.6;
          color: #4b5563;
        }

        .cf-col-text p + p {
          margin-top: 8px;
        }

        /* Full Width Center Gray Ribbon Banner */
        .cf-banner-ribbon {
          width: 100%;
          background-color: #f0f2f5;
          border-top: 1px solid #e2e8f0;
          border-bottom: 1px solid #e2e8f0;
          padding: 30px 20px 26px 20px;
          text-align: center;
          margin-bottom: 26px;
          box-sizing: border-box;
        }

        .cf-banner-inner {
          max-width: 940px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .cf-browser-mockup {
          max-width: 600px;
          width: 100%;
          background: #ffffff;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          overflow: hidden;
          border: 1px solid #dcdcdc;
          margin-bottom: 14px;
        }

        .cf-browser-header {
          background: #6b7280;
          height: 32px;
          display: flex;
          align-items: center;
          padding: 0 12px;
          gap: 6px;
        }

        .cf-browser-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #ffffff;
          opacity: 0.85;
          display: inline-block;
        }

        .cf-browser-address-bar {
          margin-left: 10px;
          background: rgba(255, 255, 255, 0.25);
          height: 18px;
          border-radius: 3px;
          padding: 0 10px;
          display: flex;
          align-items: center;
          font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
          font-size: 11px;
          color: #f3f4f6;
          width: 50%;
          max-width: 240px;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .cf-browser-body {
          height: 160px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
        }

        .cf-badge-circle {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background-color: #bd2426;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 16px rgba(189, 36, 38, 0.25);
        }

        .cf-banner-forbidden {
          font-size: 22px;
          font-weight: 700;
          color: #1e293b;
          letter-spacing: -0.3px;
          margin-bottom: 3px;
        }

        .cf-banner-restricted {
          font-size: 13.5px;
          font-weight: 500;
          color: #dc2626;
        }

        /* Technical Details Section */
        .cf-tech-section-wrap {
          max-width: 940px;
          margin: 0 auto;
          padding: 0 24px;
          box-sizing: border-box;
        }

        .cf-hatched-divider {
          width: 100%;
          height: 6px;
          background: repeating-linear-gradient(45deg, #cbd5e1, #cbd5e1 2px, transparent 2px, transparent 6px);
          opacity: 0.7;
        }

        .cf-hatched-top {
          margin-bottom: 20px;
        }

        .cf-hatched-bottom {
          margin-top: 20px;
          margin-bottom: 22px;
        }

        .cf-tech-grid {
          display: grid;
          grid-template-columns: 1.1fr 1fr 1.1fr;
          gap: 18px 36px;
          text-align: left;
        }

        .cf-tech-label {
          font-size: 11px;
          font-weight: 700;
          color: #111827;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }

        .cf-tech-value {
          font-size: 13px;
          color: #374151;
          line-height: 1.45;
          word-break: break-word;
        }

        .cf-tech-mono {
          font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
          font-size: 13.5px;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: 0.3px;
        }

        .cf-attack-badge {
          display: inline-block;
          background-color: #fee2e2;
          color: #dc2626;
          border: 1px solid #fecdd3;
          font-size: 11.5px;
          font-weight: 600;
          padding: 2.5px 12px;
          border-radius: 9999px;
          margin-top: 2px;
          letter-spacing: 0.2px;
        }

        .cf-actions-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }

        .cf-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 12.5px;
          font-weight: 600;
          padding: 8px 18px;
          border-radius: 6px;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.15s ease;
          border: 1px solid transparent;
        }

        .cf-btn-primary {
          background-color: #0f172a;
          color: #ffffff;
          border-color: #0f172a;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
        }

        .cf-btn-primary:hover {
          background-color: #1e293b;
        }

        .cf-btn-secondary {
          background-color: #ffffff;
          color: #334155;
          border-color: #cbd5e1;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
        }

        .cf-btn-secondary:hover {
          background-color: #f8fafc;
          border-color: #94a3b8;
          color: #0f172a;
        }

        .cf-footer-note {
          font-size: 11.5px;
          color: #64748b;
          text-align: center;
          line-height: 1.5;
          padding: 0 20px;
        }

        @media (max-width: 768px) {
          .cf-top-columns-grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }
          .cf-tech-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          .cf-browser-body {
            height: 130px;
          }
        }

        /* Modal */
        .cf-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(2px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .cf-modal-box {
          background: #ffffff;
          border-radius: 8px;
          padding: 26px;
          width: 100%;
          max-width: 480px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.25);
          text-align: left;
        }

        .cf-input {
          width: 100%;
          padding: 8px 12px;
          border-radius: 6px;
          border: 1px solid #d1d5db;
          font-size: 13.5px;
          margin-bottom: 12px;
          box-sizing: border-box;
          outline: none;
        }
        .cf-input:focus {
          border-color: #0f172a;
        }
      `}),(0,o.jsx)(`div`,{className:`cf-top-pattern`,"aria-hidden":`true`}),(0,o.jsxs)(`div`,{className:`cf-page-container`,children:[(0,o.jsx)(`div`,{className:`cf-top-columns-wrap`,children:(0,o.jsxs)(`div`,{className:`cf-top-columns-grid`,children:[(0,o.jsxs)(`div`,{children:[(0,o.jsx)(`h3`,{className:`cf-col-heading`,children:`Why was this request blocked?`}),(0,o.jsx)(`div`,{className:`cf-col-text`,children:(0,o.jsx)(`p`,{children:`This website is using MDefender Pro WAF security to protect itself from online attacks. The action you performed triggered automated security filters designed to block malicious payloads, bots, and unauthorized access.`})})]}),(0,o.jsxs)(`div`,{children:[(0,o.jsx)(`h3`,{className:`cf-col-heading`,children:`What can I do to resolve this?`}),(0,o.jsxs)(`div`,{className:`cf-col-text`,children:[(0,o.jsx)(`p`,{children:`You can email the site administrator with your Reference ID and Client IP found below.`}),(0,o.jsx)(`p`,{children:`If you believe this is a legitimate request, the security operations team can review the audit log and whitelist your connection.`})]})]})]})}),(0,o.jsx)(`div`,{className:`cf-banner-ribbon`,children:(0,o.jsxs)(`div`,{className:`cf-banner-inner`,children:[(0,o.jsxs)(`div`,{className:`cf-browser-mockup`,children:[(0,o.jsxs)(`div`,{className:`cf-browser-header`,"aria-hidden":`true`,children:[(0,o.jsx)(`span`,{className:`cf-browser-dot`}),(0,o.jsx)(`span`,{className:`cf-browser-dot`}),(0,o.jsx)(`span`,{className:`cf-browser-dot`}),(0,o.jsxs)(`span`,{className:`cf-browser-address-bar`,children:[`https://`,f]})]}),(0,o.jsx)(`div`,{className:`cf-browser-body`,children:(0,o.jsx)(`div`,{className:`cf-badge-circle`,role:`img`,"aria-label":`Access Blocked`,children:(0,o.jsxs)(`svg`,{width:`32`,height:`32`,viewBox:`0 0 24 24`,fill:`none`,stroke:`#ffffff`,strokeWidth:`3.4`,strokeLinecap:`round`,strokeLinejoin:`round`,children:[(0,o.jsx)(`line`,{x1:`18`,y1:`6`,x2:`6`,y2:`18`}),(0,o.jsx)(`line`,{x1:`6`,y1:`6`,x2:`18`,y2:`18`})]})})})]}),(0,o.jsx)(`div`,{className:`cf-banner-forbidden`,children:`403 Forbidden — Access Denied`}),(0,o.jsxs)(`div`,{className:`cf-banner-restricted`,children:[`Access to `,f,` is restricted`]})]})}),(0,o.jsxs)(`div`,{className:`cf-tech-section-wrap`,children:[(0,o.jsx)(`div`,{className:`cf-hatched-divider cf-hatched-top`,"aria-hidden":`true`}),(0,o.jsxs)(`div`,{className:`cf-tech-grid`,children:[(0,o.jsxs)(`div`,{children:[(0,o.jsx)(`div`,{className:`cf-tech-label`,children:`YOUR IP`}),(0,o.jsx)(`div`,{className:`cf-tech-value cf-tech-mono`,children:n})]}),(0,o.jsxs)(`div`,{children:[(0,o.jsx)(`div`,{className:`cf-tech-label`,children:`REFERENCE ID`}),(0,o.jsx)(`div`,{className:`cf-tech-value cf-tech-mono`,children:u})]}),(0,o.jsxs)(`div`,{children:[(0,o.jsx)(`div`,{className:`cf-tech-label`,children:`TIMESTAMP`}),(0,o.jsx)(`div`,{className:`cf-tech-value`,children:l})]}),(0,o.jsxs)(`div`,{children:[(0,o.jsx)(`div`,{className:`cf-tech-label`,children:`VIOLATION REASON`}),(0,o.jsx)(`div`,{className:`cf-tech-value`,children:c})]}),(0,o.jsxs)(`div`,{children:[(0,o.jsx)(`div`,{className:`cf-tech-label`,children:`ATTACK CLASSIFICATION`}),(0,o.jsx)(`div`,{className:`cf-tech-value`,children:(0,o.jsx)(`span`,{className:`cf-attack-badge`,children:t})})]}),(0,o.jsxs)(`div`,{children:[(0,o.jsx)(`div`,{className:`cf-tech-label`,children:`PROTECTION ENGINE`}),(0,o.jsxs)(`div`,{className:`cf-tech-value`,children:[`MDefender Pro WAF v4.3`,(0,o.jsx)(`br`,{}),f]})]})]}),(0,o.jsx)(`div`,{className:`cf-hatched-divider cf-hatched-bottom`,"aria-hidden":`true`}),(0,o.jsxs)(`div`,{className:`cf-actions-row`,children:[(0,o.jsx)(`button`,{type:`button`,className:`cf-btn cf-btn-primary`,onClick:()=>window.location.href=`/`,children:`Return to Homepage`}),(0,o.jsx)(`button`,{type:`button`,className:`cf-btn cf-btn-secondary`,onClick:()=>{navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(u).then(()=>{E(!0),setTimeout(()=>E(!1),2e3)}).catch(()=>{alert(`Reference ID: `+u)}):alert(`Reference ID: `+u)},children:T?`Copied!`:`Copy Reference ID`}),(0,o.jsx)(`button`,{type:`button`,className:`cf-btn cf-btn-secondary`,onClick:()=>m(!0),children:`Contact Security Operations`})]}),(0,o.jsx)(`div`,{className:`cf-footer-note`,children:`Performance & security by MDefender Pro AI Firewall. All critical system events are logged and audited.`})]})]}),p&&(0,o.jsx)(`div`,{className:`cf-modal-overlay`,onClick:()=>m(!1),children:(0,o.jsxs)(`div`,{className:`cf-modal-box`,onClick:e=>e.stopPropagation(),children:[(0,o.jsxs)(`div`,{style:{display:`flex`,justifyContent:`space-between`,alignItems:`center`,marginBottom:`16px`},children:[(0,o.jsx)(`h3`,{style:{margin:0,fontSize:`16px`,fontWeight:600,color:`#bd2426`},children:`Contact Security Operations`}),(0,o.jsx)(`button`,{style:{background:`transparent`,border:`none`,color:`#888`,fontSize:`20px`,cursor:`pointer`},onClick:()=>m(!1),children:`×`})]}),x?(0,o.jsxs)(`div`,{style:{textAlign:`center`,padding:`16px 0`},children:[(0,o.jsx)(`div`,{style:{width:`48px`,height:`48px`,borderRadius:`50%`,background:`#dcfce7`,color:`#16a34a`,fontSize:`20px`,display:`flex`,alignItems:`center`,justifyContent:`center`,margin:`0 auto 12px`},children:`✓`}),(0,o.jsx)(`h4`,{style:{margin:`0 0 6px 0`,fontSize:`15px`,color:`#111827`},children:`Report Submitted`}),(0,o.jsxs)(`p`,{style:{fontSize:`13px`,color:`#6b7280`,margin:`0 0 16px 0`,lineHeight:1.5},children:[`Incident Reference ID `,(0,o.jsx)(`strong`,{children:u}),` has been logged to the SOC team.`]}),(0,o.jsx)(`button`,{className:`cf-btn cf-btn-primary`,onClick:()=>m(!1),style:{margin:`0 auto`},children:`Close`})]}):(0,o.jsxs)(`form`,{onSubmit:async e=>{e.preventDefault(),b(!0),w(``);try{await i.reportFalsePositive({reference_id:u,client_ip:s,url:d,payload:window.location.search||d,attack_type:t,reason:c,user_email:h,comments:_}),S(!0)}catch(e){w(e.message||`Failed to submit report. Please email the administrator.`)}finally{b(!1)}},children:[(0,o.jsx)(`p`,{style:{fontSize:`12.5px`,color:`#666666`,marginBottom:`14px`,lineHeight:1.5},children:`If your request was blocked erroneously, provide your email and details below for administrative review.`}),C&&(0,o.jsx)(`div`,{style:{padding:`8px 12px`,borderRadius:`6px`,background:`#fee2e2`,color:`#991b1b`,fontSize:`12.5px`,marginBottom:`12px`},children:C}),(0,o.jsx)(`div`,{style:{marginBottom:`4px`,fontSize:`11.5px`,fontWeight:600,color:`#374151`},children:`Incident Reference ID`}),(0,o.jsx)(`input`,{type:`text`,className:`cf-input`,value:u,disabled:!0,style:{background:`#f9fafb`,color:`#6b7280`}}),(0,o.jsx)(`div`,{style:{marginBottom:`4px`,fontSize:`11.5px`,fontWeight:600,color:`#374151`},children:`Your Email (Optional)`}),(0,o.jsx)(`input`,{type:`email`,className:`cf-input`,placeholder:`contact@yourdomain.com`,value:h,onChange:e=>g(e.target.value)}),(0,o.jsx)(`div`,{style:{marginBottom:`4px`,fontSize:`11.5px`,fontWeight:600,color:`#374151`},children:`What were you trying to do?`}),(0,o.jsx)(`textarea`,{rows:3,className:`cf-input`,placeholder:`Describe your actions before the block page appeared...`,value:_,onChange:e=>v(e.target.value),style:{resize:`vertical`}}),(0,o.jsxs)(`div`,{style:{display:`flex`,justifyContent:`flex-end`,gap:`10px`,marginTop:`14px`},children:[(0,o.jsx)(`button`,{type:`button`,className:`cf-btn cf-btn-secondary`,onClick:()=>m(!1),children:`Cancel`}),(0,o.jsx)(`button`,{type:`submit`,className:`cf-btn cf-btn-primary`,disabled:y,children:y?`Submitting...`:`Submit to SOC`})]})]})]})})]})}export{s as default};