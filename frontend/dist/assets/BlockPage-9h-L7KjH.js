import{i as e,n as t,t as n}from"./jsx-runtime-BKllkxft.js";import{A as r,r as i}from"./index-DuUkeo85.js";var a=e(t(),1),o=n();function s(){let[e]=r(),t=e.get(`attack_type`)||`Cross-Site Scripting (XSS)`,n=e.get(`client_ip`)||`103.120.45.241`,s=e.get(`real_ip`)||n,c=e.get(`reason`)||`Request blocked by active security rule (Pattern Match)`,l=e.get(`timestamp`)||new Date().toISOString().replace(`T`,` `).slice(0,19)+` UTC`,u=e.get(`reference_id`)||`MDEF-`+Math.random().toString(36).substr(2,8).toUpperCase(),d=e.get(`url`)||window.location.pathname,f=e.get(`host`)||window.location.hostname||`mahabubur.shop`,[p,m]=(0,a.useState)(!1),[h,g]=(0,a.useState)(``),[_,v]=(0,a.useState)(``),[y,b]=(0,a.useState)(!1),[x,S]=(0,a.useState)(!1),[C,w]=(0,a.useState)(``),[T,E]=(0,a.useState)(!1);return(0,o.jsxs)(`div`,{className:`cf-block-page-root`,children:[(0,o.jsx)(`style`,{children:`
        .cf-block-page-root {
          width: 100%;
          height: 100vh;
          max-height: 100vh;
          margin: 0;
          padding: 0;
          background-color: #ffffff;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: #334155;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow: hidden;
          box-sizing: border-box;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        .cf-content-wrap {
          max-width: 1140px;
          width: 100%;
          margin: 0 auto;
          padding: 0 32px;
          box-sizing: border-box;
        }

        /* Top Section */
        .cf-top-section {
          padding-top: 26px;
          padding-bottom: 16px;
          flex: 0 0 auto;
        }

        .cf-heading-wrap {
          margin-bottom: 16px;
        }

        .cf-main-title {
          font-size: 26px;
          font-weight: 600;
          color: #0f172a;
          margin: 0 0 4px 0;
          letter-spacing: -0.015em;
          line-height: 1.25;
        }

        .cf-main-subtitle {
          font-size: 14px;
          font-weight: 400;
          color: #64748b;
          margin: 0;
        }

        .cf-site-host {
          color: #0f172a;
          font-weight: 600;
        }

        .cf-explainer-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 48px;
        }

        .cf-explainer-col h2 {
          font-size: 15px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 6px 0;
          line-height: 1.3;
        }

        .cf-explainer-col p {
          font-size: 13.5px;
          line-height: 1.6;
          color: #475569;
          margin: 0;
        }

        /* Center Banner */
        .cf-mockup-section {
          width: 100%;
          background-color: #eeeeee;
          border-top: 1px solid #e0e0e0;
          border-bottom: 1px solid #e0e0e0;
          padding: 22px 24px;
          box-sizing: border-box;
          display: flex;
          justify-content: center;
          align-items: center;
          flex: 1 1 auto;
          min-height: 0;
        }

        .cf-browser-mockup {
          max-width: 800px;
          width: 100%;
          background: #ffffff;
          border-radius: 8px;
          box-shadow: 0 4px 18px rgba(0, 0, 0, 0.07);
          overflow: hidden;
          border: 1px solid #d4d4d4;
        }

        .cf-browser-header {
          background: #64748b;
          height: 32px;
          display: flex;
          align-items: center;
          padding: 0 14px;
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
          margin-left: 12px;
          background: rgba(255, 255, 255, 0.28);
          height: 18px;
          border-radius: 3px;
          padding: 0 12px;
          display: flex;
          align-items: center;
          font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
          font-size: 11.5px;
          color: #f8fafc;
          width: 48%;
          max-width: 260px;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .cf-browser-body {
          height: 155px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
        }

        .cf-badge-circle {
          width: 70px;
          height: 70px;
          border-radius: 50%;
          background-color: #bd2426;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 6px 18px rgba(189, 36, 38, 0.25);
        }

        /* Bottom Section */
        .cf-bottom-section {
          padding-top: 16px;
          padding-bottom: 22px;
          flex: 0 0 auto;
        }

        .cf-tech-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 12px 24px;
          margin-bottom: 16px;
          display: grid;
          grid-template-columns: 1.1fr 1.2fr 1.1fr 1.1fr;
          gap: 16px;
          align-items: center;
        }

        .cf-tech-label {
          font-size: 10.5px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 3px;
        }

        .cf-tech-value {
          font-size: 13.5px;
          font-weight: 600;
          color: #1e293b;
        }

        .cf-tech-mono {
          font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
          font-size: 13px;
          color: #0f172a;
        }

        .cf-threat-pill {
          display: inline-block;
          background-color: #fee2e2;
          color: #dc2626;
          border: 1px solid #fecdd3;
          font-size: 11px;
          font-weight: 600;
          padding: 2px 10px;
          border-radius: 9999px;
          letter-spacing: 0.2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }

        .cf-action-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
          flex-wrap: wrap;
        }

        .cf-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 500;
          padding: 8px 20px;
          border-radius: 6px;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.15s ease;
          border: 1px solid transparent;
        }

        .cf-btn-primary {
          background-color: #0f172a;
          color: #ffffff;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.1);
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
          background-color: #f1f5f9;
          border-color: #94a3b8;
          color: #0f172a;
        }

        @media (max-height: 640px) or (max-width: 820px) {
          .cf-block-page-root {
            height: auto;
            max-height: none;
            overflow-y: auto;
          }
          .cf-explainer-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          .cf-tech-card {
            grid-template-columns: 1fr 1fr;
            gap: 12px;
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
      `}),(0,o.jsx)(`header`,{className:`cf-top-section`,children:(0,o.jsxs)(`div`,{className:`cf-content-wrap`,children:[(0,o.jsxs)(`div`,{className:`cf-heading-wrap`,children:[(0,o.jsx)(`h1`,{className:`cf-main-title`,children:`Access Restricted by Security Policy`}),(0,o.jsxs)(`p`,{className:`cf-main-subtitle`,children:[`Your connection to `,(0,o.jsx)(`span`,{className:`cf-site-host`,children:f}),` was intercepted by automated security protection.`]})]}),(0,o.jsxs)(`div`,{className:`cf-explainer-grid`,children:[(0,o.jsxs)(`div`,{className:`cf-explainer-col`,children:[(0,o.jsx)(`h2`,{children:`Why was this request blocked?`}),(0,o.jsx)(`p`,{children:`This website employs MDefender Pro automated defense to safeguard infrastructure against malicious probes, automated abuse, and abnormal request patterns. Your interaction triggered an edge inspection security rule.`})]}),(0,o.jsxs)(`div`,{className:`cf-explainer-col`,children:[(0,o.jsx)(`h2`,{children:`What can I do to resolve this?`}),(0,o.jsx)(`p`,{children:`If you believe this restriction was triggered by mistake, you can return to the homepage or notify the website administrator with your incident Reference ID and Client IP shown below.`})]})]})]})}),(0,o.jsx)(`section`,{className:`cf-mockup-section`,children:(0,o.jsxs)(`div`,{className:`cf-browser-mockup`,children:[(0,o.jsxs)(`div`,{className:`cf-browser-header`,"aria-hidden":`true`,children:[(0,o.jsx)(`span`,{className:`cf-browser-dot`}),(0,o.jsx)(`span`,{className:`cf-browser-dot`}),(0,o.jsx)(`span`,{className:`cf-browser-dot`}),(0,o.jsxs)(`span`,{className:`cf-browser-address-bar`,children:[`https://`,f]})]}),(0,o.jsx)(`div`,{className:`cf-browser-body`,children:(0,o.jsx)(`div`,{className:`cf-badge-circle`,role:`img`,"aria-label":`Access Blocked`,children:(0,o.jsxs)(`svg`,{width:`32`,height:`32`,viewBox:`0 0 24 24`,fill:`none`,stroke:`#ffffff`,strokeWidth:`3.4`,strokeLinecap:`round`,strokeLinejoin:`round`,children:[(0,o.jsx)(`line`,{x1:`18`,y1:`6`,x2:`6`,y2:`18`}),(0,o.jsx)(`line`,{x1:`6`,y1:`6`,x2:`18`,y2:`18`})]})})})]})}),(0,o.jsx)(`footer`,{className:`cf-bottom-section`,children:(0,o.jsxs)(`div`,{className:`cf-content-wrap`,children:[(0,o.jsxs)(`div`,{className:`cf-tech-card`,children:[(0,o.jsxs)(`div`,{children:[(0,o.jsx)(`div`,{className:`cf-tech-label`,children:`Client IP Address`}),(0,o.jsx)(`div`,{className:`cf-tech-value cf-tech-mono`,children:n})]}),(0,o.jsxs)(`div`,{children:[(0,o.jsx)(`div`,{className:`cf-tech-label`,children:`Incident Reference ID`}),(0,o.jsx)(`div`,{className:`cf-tech-value cf-tech-mono`,children:u})]}),(0,o.jsxs)(`div`,{children:[(0,o.jsx)(`div`,{className:`cf-tech-label`,children:`Timestamp (UTC)`}),(0,o.jsx)(`div`,{className:`cf-tech-value`,children:l})]}),(0,o.jsxs)(`div`,{children:[(0,o.jsx)(`div`,{className:`cf-tech-label`,children:`Security Classification`}),(0,o.jsx)(`div`,{children:(0,o.jsx)(`span`,{className:`cf-threat-pill`,children:t})})]})]}),(0,o.jsxs)(`div`,{className:`cf-action-row`,children:[(0,o.jsx)(`button`,{type:`button`,className:`cf-btn cf-btn-primary`,onClick:()=>window.location.href=`/`,children:`Return to Homepage`}),(0,o.jsx)(`button`,{type:`button`,className:`cf-btn cf-btn-secondary`,onClick:()=>{navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(u).then(()=>{E(!0),setTimeout(()=>E(!1),2e3)}).catch(()=>{alert(`Reference ID: `+u)}):alert(`Reference ID: `+u)},children:T?`Copied!`:`Copy Reference ID`}),(0,o.jsx)(`button`,{type:`button`,className:`cf-btn cf-btn-secondary`,onClick:()=>m(!0),children:`Contact Administrator`})]})]})}),p&&(0,o.jsx)(`div`,{className:`cf-modal-overlay`,onClick:()=>m(!1),children:(0,o.jsxs)(`div`,{className:`cf-modal-box`,onClick:e=>e.stopPropagation(),children:[(0,o.jsxs)(`div`,{style:{display:`flex`,justifyContent:`space-between`,alignItems:`center`,marginBottom:`16px`},children:[(0,o.jsx)(`h3`,{style:{margin:0,fontSize:`16px`,fontWeight:600,color:`#bd2426`},children:`Contact Security Operations`}),(0,o.jsx)(`button`,{style:{background:`transparent`,border:`none`,color:`#888`,fontSize:`20px`,cursor:`pointer`},onClick:()=>m(!1),children:`×`})]}),x?(0,o.jsxs)(`div`,{style:{textAlign:`center`,padding:`16px 0`},children:[(0,o.jsx)(`div`,{style:{width:`48px`,height:`48px`,borderRadius:`50%`,background:`#dcfce7`,color:`#16a34a`,fontSize:`20px`,display:`flex`,alignItems:`center`,justifyContent:`center`,margin:`0 auto 12px`},children:`✓`}),(0,o.jsx)(`h4`,{style:{margin:`0 0 6px 0`,fontSize:`15px`,color:`#111827`},children:`Report Submitted`}),(0,o.jsxs)(`p`,{style:{fontSize:`13px`,color:`#6b7280`,margin:`0 0 16px 0`,lineHeight:1.5},children:[`Incident Reference ID `,(0,o.jsx)(`strong`,{children:u}),` has been logged to the SOC team.`]}),(0,o.jsx)(`button`,{className:`cf-btn cf-btn-primary`,onClick:()=>m(!1),style:{margin:`0 auto`},children:`Close`})]}):(0,o.jsxs)(`form`,{onSubmit:async e=>{e.preventDefault(),b(!0),w(``);try{await i.reportFalsePositive({reference_id:u,client_ip:s,url:d,payload:window.location.search||d,attack_type:t,reason:c,user_email:h,comments:_}),S(!0)}catch(e){w(e.message||`Failed to submit report. Please email the administrator.`)}finally{b(!1)}},children:[(0,o.jsx)(`p`,{style:{fontSize:`12.5px`,color:`#666666`,marginBottom:`14px`,lineHeight:1.5},children:`If your request was blocked erroneously, provide your email and details below for administrative review.`}),C&&(0,o.jsx)(`div`,{style:{padding:`8px 12px`,borderRadius:`6px`,background:`#fee2e2`,color:`#991b1b`,fontSize:`12.5px`,marginBottom:`12px`},children:C}),(0,o.jsx)(`div`,{style:{marginBottom:`4px`,fontSize:`11.5px`,fontWeight:600,color:`#374151`},children:`Incident Reference ID`}),(0,o.jsx)(`input`,{type:`text`,className:`cf-input`,value:u,disabled:!0,style:{background:`#f9fafb`,color:`#6b7280`}}),(0,o.jsx)(`div`,{style:{marginBottom:`4px`,fontSize:`11.5px`,fontWeight:600,color:`#374151`},children:`Your Email (Optional)`}),(0,o.jsx)(`input`,{type:`email`,className:`cf-input`,placeholder:`contact@yourdomain.com`,value:h,onChange:e=>g(e.target.value)}),(0,o.jsx)(`div`,{style:{marginBottom:`4px`,fontSize:`11.5px`,fontWeight:600,color:`#374151`},children:`What were you trying to do?`}),(0,o.jsx)(`textarea`,{rows:3,className:`cf-input`,placeholder:`Describe your actions before the block page appeared...`,value:_,onChange:e=>v(e.target.value),style:{resize:`vertical`}}),(0,o.jsxs)(`div`,{style:{display:`flex`,justifyContent:`flex-end`,gap:`10px`,marginTop:`14px`},children:[(0,o.jsx)(`button`,{type:`button`,className:`cf-btn cf-btn-secondary`,onClick:()=>m(!1),children:`Cancel`}),(0,o.jsx)(`button`,{type:`submit`,className:`cf-btn cf-btn-primary`,disabled:y,children:y?`Submitting...`:`Submit to SOC`})]})]})]})})]})}export{s as default};