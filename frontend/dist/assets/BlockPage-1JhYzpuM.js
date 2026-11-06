import{i as e,n as t,t as n}from"./jsx-runtime-BKllkxft.js";import{A as r}from"./index-B1EY3jHt.js";var i=e(t(),1),a=n();function o(){let[e]=r(),t=e.get(`domain`)||window.location.hostname||`mahabubur.shop`,n=e.get(`ray_id`)||e.get(`ref_id`)||`MDEF-2070BF20`,o=e.get(`ip`)||`103.120.45.241`,s=e.get(`rule`)||`Pre-Flight WAAP: SQL & NoSQL Injection Guard`,c=e.get(`timestamp`)||new Date().toISOString().replace(`T`,` `).substring(0,19)+` UTC`,[l,u]=(0,i.useState)(!1),[d,f]=(0,i.useState)(!1),[p,m]=(0,i.useState)(``),[h,g]=(0,i.useState)(``),[_,v]=(0,i.useState)(!1);return(0,a.jsxs)(`div`,{className:`bp-root`,children:[(0,a.jsx)(`style`,{children:`
        *, *::before, *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        html, body {
          width: 100%;
          min-height: 100%;
          background-color: #ffffff;
        }

        .bp-root {
          width: 100%;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background-color: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Helvetica Neue", Arial, sans-serif;
          color: #333333;
          -webkit-font-smoothing: antialiased;
        }

        .bp-content-wrap {
          max-width: 900px;
          width: 100%;
          margin: 0 auto;
          padding: 0 24px;
        }

        /* Top Heading Section */
        .bp-header-section {
          padding-top: 52px;
          padding-bottom: 28px;
        }

        .bp-policy-pill {
          display: inline-block;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #555555;
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          padding: 4px 12px;
          border-radius: 9999px;
          margin-bottom: 12px;
        }

        .bp-title {
          font-size: 38px;
          font-weight: 400;
          color: #333333;
          margin: 0 0 8px 0;
          letter-spacing: -0.02em;
          line-height: 1.2;
        }

        .bp-subtitle {
          font-size: 16px;
          font-weight: 400;
          color: #666666;
          margin: 0;
          line-height: 1.4;
        }

        .bp-domain {
          color: #333333;
          font-weight: 500;
        }

        /* Center Full-Width Gray Section with Browser Mockup */
        .bp-mockup-section {
          width: 100%;
          background-color: #eeeeee;
          border-top: 1px solid #e2e2e2;
          border-bottom: 1px solid #e2e2e2;
          padding: 48px 24px;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .bp-browser-mockup {
          max-width: 720px;
          width: 100%;
          background: #ffffff;
          border-radius: 6px;
          box-shadow: 0 4px 18px rgba(0, 0, 0, 0.06);
          overflow: hidden;
          border: 1px solid #dcdcdc;
        }

        .bp-browser-header {
          background: #8a8a8a;
          height: 38px;
          display: flex;
          align-items: center;
          padding: 0 14px;
          gap: 6px;
        }

        .bp-browser-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #ffffff;
          opacity: 0.85;
          display: inline-block;
        }

        .bp-browser-address-bar {
          margin-left: 14px;
          background: rgba(255, 255, 255, 0.3);
          height: 20px;
          border-radius: 3px;
          width: 38%;
          max-width: 220px;
        }

        .bp-browser-body {
          height: 270px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
        }

        .bp-badge-circle {
          width: 94px;
          height: 94px;
          border-radius: 50%;
          background-color: #bd2426;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 6px 18px rgba(189, 36, 38, 0.22);
        }

        .bp-badge-circle svg {
          width: 44px;
          height: 44px;
          stroke: #ffffff;
          stroke-width: 3.4;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        /* Bottom 2 Columns */
        .bp-columns-section {
          padding-top: 48px;
          padding-bottom: 36px;
        }

        .bp-columns-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 52px;
        }

        @media (max-width: 740px) {
          .bp-columns-grid {
            grid-template-columns: 1fr;
            gap: 28px;
          }
        }

        .bp-col-heading {
          font-size: 18px;
          font-weight: 500;
          color: #333333;
          margin: 0 0 12px 0;
          line-height: 1.3;
        }

        .bp-col-desc {
          font-size: 14px;
          line-height: 1.65;
          color: #555555;
          margin: 0;
        }

        .bp-attack-pill {
          margin-top: 14px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: #fee2e2;
          border: 1px solid #fca5a5;
          border-radius: 4px;
          font-size: 12px;
          color: #991b1b;
          font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
        }

        .bp-action-tools {
          margin-top: 16px;
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .bp-btn-contact {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: #2b2b2b;
          color: #ffffff;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 500;
          border: none;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .bp-btn-contact:hover {
          background: #111111;
        }

        .bp-btn-copy {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .bp-btn-copy:hover {
          background: #e5e7eb;
          color: #111111;
        }

        /* Footer Metadata */
        .bp-footer-section {
          border-top: 1px solid #e2e2e2;
          padding: 26px 0 36px 0;
        }

        .bp-footer-meta {
          font-size: 13px;
          color: #777777;
          line-height: 1.8;
          text-align: center;
        }

        .bp-footer-meta strong {
          color: #222222;
        }

        .bp-meta-dot {
          margin: 0 10px;
          color: #9ca3af;
        }

        .bp-ip-mono {
          font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
          color: #374151;
          font-weight: 500;
        }

        /* Modal Styles */
        .bp-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.45);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 16px;
        }

        .bp-modal-card {
          background: #ffffff;
          border-radius: 8px;
          max-width: 480px;
          width: 100%;
          padding: 24px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }
      `}),(0,a.jsx)(`header`,{className:`bp-header-section`,children:(0,a.jsxs)(`div`,{className:`bp-content-wrap`,children:[(0,a.jsx)(`span`,{className:`bp-policy-pill`,children:`MDEFENDER PRO • EDGE POLICY ENFORCEMENT`}),(0,a.jsx)(`h1`,{className:`bp-title`,children:`Access Restricted by Security Policy`}),(0,a.jsxs)(`p`,{className:`bp-subtitle`,children:[`Your connection to `,(0,a.jsx)(`span`,{className:`bp-domain`,children:t}),` was flagged and intercepted by automated threat protection.`]})]})}),(0,a.jsx)(`section`,{className:`bp-mockup-section`,children:(0,a.jsxs)(`div`,{className:`bp-browser-mockup`,children:[(0,a.jsxs)(`div`,{className:`bp-browser-header`,"aria-hidden":`true`,children:[(0,a.jsx)(`span`,{className:`bp-browser-dot`}),(0,a.jsx)(`span`,{className:`bp-browser-dot`}),(0,a.jsx)(`span`,{className:`bp-browser-dot`}),(0,a.jsx)(`span`,{className:`bp-browser-address-bar`})]}),(0,a.jsx)(`div`,{className:`bp-browser-body`,children:(0,a.jsx)(`div`,{className:`bp-badge-circle`,role:`img`,"aria-label":`Blocked Access`,children:(0,a.jsxs)(`svg`,{viewBox:`0 0 24 24`,fill:`none`,children:[(0,a.jsx)(`line`,{x1:`18`,y1:`6`,x2:`6`,y2:`18`}),(0,a.jsx)(`line`,{x1:`6`,y1:`6`,x2:`18`,y2:`18`})]})})})]})}),(0,a.jsx)(`main`,{className:`bp-columns-section`,children:(0,a.jsx)(`div`,{className:`bp-content-wrap`,children:(0,a.jsxs)(`div`,{className:`bp-columns-grid`,children:[(0,a.jsxs)(`div`,{children:[(0,a.jsx)(`h2`,{className:`bp-col-heading`,children:`Why have I been blocked?`}),(0,a.jsx)(`p`,{className:`bp-col-desc`,children:`This website is using a security service to protect itself from online attacks. The action you just performed triggered the security solution. There are several actions that could trigger this block including submitting a certain word or phrase, a SQL command or malformed data.`}),(0,a.jsxs)(`div`,{className:`bp-attack-pill`,children:[(0,a.jsx)(`span`,{children:`Violation:`}),(0,a.jsx)(`strong`,{children:s})]})]}),(0,a.jsxs)(`div`,{children:[(0,a.jsx)(`h2`,{className:`bp-col-heading`,children:`What can I do to resolve this?`}),(0,a.jsx)(`p`,{className:`bp-col-desc`,children:`You can email the site owner to let them know you were blocked. Please include what you were doing when this page came up and the MDefender Ray ID found at the bottom of this page.`}),(0,a.jsxs)(`div`,{className:`bp-action-tools`,children:[(0,a.jsx)(`button`,{type:`button`,className:`bp-btn-contact`,onClick:()=>f(!0),children:`Contact Site Administrator`}),(0,a.jsx)(`button`,{type:`button`,className:`bp-btn-copy`,onClick:()=>{navigator.clipboard&&navigator.clipboard.writeText&&(navigator.clipboard.writeText(n),u(!0),setTimeout(()=>u(!1),2e3))},style:l?{borderColor:`#10b981`,color:`#10b981`}:{},children:l?`Copied!`:`Copy Ray ID`})]})]})]})})}),(0,a.jsx)(`footer`,{className:`bp-footer-section`,children:(0,a.jsx)(`div`,{className:`bp-content-wrap`,children:(0,a.jsxs)(`div`,{className:`bp-footer-meta`,children:[(0,a.jsxs)(`div`,{children:[(0,a.jsxs)(`span`,{children:[`MDefender Ray ID: `,(0,a.jsx)(`strong`,{children:n})]}),(0,a.jsx)(`span`,{className:`bp-meta-dot`,children:`•`}),(0,a.jsxs)(`span`,{children:[`Your IP: `,(0,a.jsx)(`span`,{className:`bp-ip-mono`,children:o})]}),(0,a.jsx)(`span`,{className:`bp-meta-dot`,children:`•`}),(0,a.jsxs)(`span`,{children:[`Performance & security by `,(0,a.jsx)(`strong`,{children:`MDefender Pro`})]})]}),(0,a.jsx)(`div`,{style:{marginTop:`4px`,fontSize:`12px`,color:`#888888`},children:(0,a.jsxs)(`span`,{children:[`Timestamp: `,c]})})]})})}),d&&(0,a.jsx)(`div`,{className:`bp-modal-overlay`,onClick:()=>f(!1),children:(0,a.jsxs)(`div`,{className:`bp-modal-card`,onClick:e=>e.stopPropagation(),children:[(0,a.jsx)(`h3`,{style:{fontSize:`18px`,fontWeight:600,color:`#0f172a`,marginBottom:`8px`},children:`Report False Positive / Request Access`}),(0,a.jsxs)(`p`,{style:{fontSize:`13px`,color:`#64748b`,marginBottom:`16px`},children:[`Your report will be sent to the security team of `,(0,a.jsx)(`strong`,{children:t}),` along with Ray ID `,(0,a.jsx)(`code`,{children:n}),`.`]}),_?(0,a.jsx)(`div`,{style:{padding:`16px`,background:`#ecfdf5`,color:`#065f46`,borderRadius:`6px`,fontSize:`13px`,fontWeight:500,textAlign:`center`},children:`Report sent successfully! The administrator will review your incident.`}):(0,a.jsxs)(`form`,{onSubmit:e=>{e.preventDefault(),v(!0),setTimeout(()=>{f(!1),v(!1),m(``),g(``)},1800)},children:[(0,a.jsxs)(`div`,{style:{marginBottom:`12px`},children:[(0,a.jsx)(`label`,{style:{display:`block`,fontSize:`12px`,fontWeight:600,color:`#334155`,marginBottom:`4px`},children:`Your Email Address`}),(0,a.jsx)(`input`,{type:`email`,required:!0,value:p,onChange:e=>m(e.target.value),placeholder:`user@example.com`,style:{width:`100%`,padding:`8px 12px`,borderRadius:`4px`,border:`1px solid #cbd5e1`,fontSize:`13px`}})]}),(0,a.jsxs)(`div`,{style:{marginBottom:`16px`},children:[(0,a.jsx)(`label`,{style:{display:`block`,fontSize:`12px`,fontWeight:600,color:`#334155`,marginBottom:`4px`},children:`What were you doing when blocked?`}),(0,a.jsx)(`textarea`,{rows:3,required:!0,value:h,onChange:e=>g(e.target.value),placeholder:`Describe your actions so the administrator can verify your request...`,style:{width:`100%`,padding:`8px 12px`,borderRadius:`4px`,border:`1px solid #cbd5e1`,fontSize:`13px`}})]}),(0,a.jsxs)(`div`,{style:{display:`flex`,justifyContent:`flex-end`,gap:`8px`},children:[(0,a.jsx)(`button`,{type:`button`,onClick:()=>f(!1),style:{padding:`7px 14px`,borderRadius:`4px`,border:`1px solid #cbd5e1`,background:`#ffffff`,color:`#475569`,fontSize:`13px`,cursor:`pointer`},children:`Cancel`}),(0,a.jsx)(`button`,{type:`submit`,style:{padding:`7px 16px`,borderRadius:`4px`,border:`none`,background:`#1e293b`,color:`#ffffff`,fontSize:`13px`,fontWeight:500,cursor:`pointer`},children:`Send Incident Report`})]})]})]})})]})}export{o as default};