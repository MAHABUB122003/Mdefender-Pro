import{i as e,n as t,t as n}from"./jsx-runtime-BKllkxft.js";import{A as r}from"./index-B9QyDpzj.js";var i=e(t(),1),a=n();function o(){let[e]=r(),t=e.get(`domain`)||window.location.hostname||`mahabubur.shop`,n=e.get(`ray_id`)||e.get(`ref_id`)||`MDEF-2070BF20`,o=e.get(`ip`)||`103.120.45.241`,s=e.get(`rule`)||`Pre-Flight WAAP: SQL & NoSQL Injection Guard`,c=e.get(`timestamp`)||new Date().toISOString().replace(`T`,` `).substring(0,19)+` UTC`,[l,u]=(0,i.useState)(!1),[d,f]=(0,i.useState)(!1),[p,m]=(0,i.useState)(``),[h,g]=(0,i.useState)(``),[_,v]=(0,i.useState)(!1);return(0,a.jsxs)(`div`,{className:`bp-root`,children:[(0,a.jsx)(`style`,{children:`
        *, *::before, *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        html, body {
          width: 100%;
          height: 100%;
          margin: 0;
          padding: 0;
          background-color: #ffffff;
          overflow: hidden;
        }

        .bp-root {
          width: 100%;
          height: 100vh;
          max-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          background-color: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Helvetica Neue", Arial, sans-serif;
          color: #334155;
          overflow: hidden;
          box-sizing: border-box;
          -webkit-font-smoothing: antialiased;
        }

        .bp-content-wrap {
          max-width: 880px;
          width: 100%;
          margin: 0 auto;
          padding: 0 20px;
          box-sizing: border-box;
        }

        /* Top Heading Section */
        .bp-header-section {
          padding-top: 18px;
          padding-bottom: 12px;
          flex: 0 0 auto;
        }

        .bp-policy-pill {
          display: inline-block;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #475569;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          padding: 3px 10px;
          border-radius: 9999px;
          margin-bottom: 8px;
        }

        .bp-title {
          font-size: 27px;
          font-weight: 600;
          color: #0f172a;
          margin: 0 0 4px 0;
          letter-spacing: -0.015em;
          line-height: 1.2;
        }

        .bp-subtitle {
          font-size: 13.5px;
          font-weight: 400;
          color: #64748b;
          margin: 0;
          line-height: 1.4;
        }

        .bp-domain {
          color: #0f172a;
          font-weight: 600;
        }

        /* Center Full-Width Gray Section */
        .bp-mockup-section {
          width: 100%;
          background-color: #ebebeb;
          border-top: 1px solid #dadada;
          border-bottom: 1px solid #dadada;
          padding: 14px 20px;
          display: flex;
          justify-content: center;
          align-items: center;
          flex: 1 1 auto;
          min-height: 0;
          box-sizing: border-box;
        }

        .bp-browser-mockup {
          max-width: 760px;
          width: 100%;
          background: #ffffff;
          border-radius: 4px;
          box-shadow: 0 4px 18px rgba(0, 0, 0, 0.06);
          overflow: hidden;
          border: 1px solid #d4d4d4;
          display: flex;
          flex-direction: column;
          max-height: 100%;
        }

        .bp-browser-header {
          background: #8c8c8c;
          height: 30px;
          display: flex;
          align-items: center;
          padding: 0 12px;
          gap: 5px;
          flex-shrink: 0;
        }

        .bp-browser-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #ffffff;
          opacity: 0.9;
          display: inline-block;
        }

        .bp-browser-address-bar {
          margin-left: 12px;
          background: rgba(255, 255, 255, 0.35);
          height: 16px;
          border-radius: 3px;
          width: 45%;
          max-width: 220px;
        }

        .bp-browser-body {
          height: 160px;
          min-height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
          flex: 1 1 auto;
        }

        .bp-badge-circle {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background-color: #bd2426;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 16px rgba(189, 36, 38, 0.22);
        }

        .bp-badge-circle svg {
          width: 32px;
          height: 32px;
          stroke: #ffffff;
          stroke-width: 3.5;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        /* Bottom 2 Columns */
        .bp-columns-section {
          padding-top: 14px;
          padding-bottom: 10px;
          flex: 0 0 auto;
        }

        .bp-columns-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 36px;
        }

        .bp-col-heading {
          font-size: 14.5px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 4px 0;
          line-height: 1.3;
        }

        .bp-col-desc {
          font-size: 12.5px;
          line-height: 1.55;
          color: #475569;
          margin: 0;
        }

        .bp-attack-pill {
          margin-top: 8px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 3px 10px;
          background: #fef2f2;
          border: 1px solid #fee2e2;
          border-radius: 4px;
          font-size: 11.5px;
          color: #991b1b;
          font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
          font-weight: 600;
        }

        .bp-action-tools {
          margin-top: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .bp-btn-contact {
          display: inline-flex;
          align-items: center;
          padding: 6.5px 14px;
          background: #1e293b;
          color: #ffffff;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
          border: none;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .bp-btn-contact:hover {
          background: #0f172a;
        }

        .bp-btn-copy {
          display: inline-flex;
          align-items: center;
          padding: 6.5px 14px;
          background: #ffffff;
          color: #334155;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .bp-btn-copy:hover {
          background: #f8fafc;
          border-color: #94a3b8;
          color: #0f172a;
        }

        /* Footer Metadata */
        .bp-footer-section {
          border-top: 1px solid #f1f5f9;
          padding: 10px 0 14px 0;
          flex: 0 0 auto;
        }

        .bp-footer-meta {
          font-size: 12px;
          color: #64748b;
          line-height: 1.6;
          text-align: center;
        }

        .bp-footer-meta strong {
          color: #0f172a;
        }

        .bp-meta-dot {
          margin: 0 8px;
          color: #94a3b8;
        }

        .bp-ip-mono {
          font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
          color: #0f172a;
          font-weight: 600;
        }

        @media (max-height: 600px) or (max-width: 740px) {
          html, body, .bp-root {
            height: auto;
            max-height: none;
            overflow-y: auto;
          }
          .bp-columns-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
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
      `}),(0,a.jsx)(`header`,{className:`bp-header-section`,children:(0,a.jsxs)(`div`,{className:`bp-content-wrap`,children:[(0,a.jsx)(`span`,{className:`bp-policy-pill`,children:`MDEFENDER PRO • EDGE POLICY ENFORCEMENT`}),(0,a.jsx)(`h1`,{className:`bp-title`,children:`Access Restricted by Security Policy`}),(0,a.jsxs)(`p`,{className:`bp-subtitle`,children:[`Your connection to `,(0,a.jsx)(`span`,{className:`bp-domain`,children:t}),` was flagged and intercepted by automated threat protection.`]})]})}),(0,a.jsx)(`section`,{className:`bp-mockup-section`,children:(0,a.jsxs)(`div`,{className:`bp-browser-mockup`,children:[(0,a.jsxs)(`div`,{className:`bp-browser-header`,"aria-hidden":`true`,children:[(0,a.jsx)(`span`,{className:`bp-browser-dot`}),(0,a.jsx)(`span`,{className:`bp-browser-dot`}),(0,a.jsx)(`span`,{className:`bp-browser-dot`}),(0,a.jsx)(`span`,{className:`bp-browser-address-bar`})]}),(0,a.jsx)(`div`,{className:`bp-browser-body`,children:(0,a.jsx)(`div`,{className:`bp-badge-circle`,role:`img`,"aria-label":`Access Restricted`,children:(0,a.jsxs)(`svg`,{viewBox:`0 0 24 24`,fill:`none`,children:[(0,a.jsx)(`line`,{x1:`18`,y1:`6`,x2:`6`,y2:`18`}),(0,a.jsx)(`line`,{x1:`6`,y1:`6`,x2:`18`,y2:`18`})]})})})]})}),(0,a.jsx)(`main`,{className:`bp-columns-section`,children:(0,a.jsx)(`div`,{className:`bp-content-wrap`,children:(0,a.jsxs)(`div`,{className:`bp-columns-grid`,children:[(0,a.jsxs)(`div`,{children:[(0,a.jsx)(`h2`,{className:`bp-col-heading`,children:`Why have I been blocked?`}),(0,a.jsx)(`p`,{className:`bp-col-desc`,children:`This website is protected by MDefender Pro automated defense to safeguard infrastructure against malicious probes, automated abuse, and abnormal request patterns. Your interaction triggered an edge inspection security rule.`}),(0,a.jsxs)(`div`,{className:`bp-attack-pill`,children:[(0,a.jsx)(`span`,{children:`Violation:`}),(0,a.jsx)(`strong`,{children:s})]})]}),(0,a.jsxs)(`div`,{children:[(0,a.jsx)(`h2`,{className:`bp-col-heading`,children:`What can I do to resolve this?`}),(0,a.jsx)(`p`,{className:`bp-col-desc`,children:`If you believe this restriction was triggered by mistake, you can notify the website administrator with your incident Reference ID and Client IP shown below.`}),(0,a.jsxs)(`div`,{className:`bp-action-tools`,children:[(0,a.jsx)(`button`,{type:`button`,className:`bp-btn-contact`,onClick:()=>f(!0),children:`Contact Site Administrator`}),(0,a.jsx)(`button`,{type:`button`,className:`bp-btn-copy`,onClick:()=>{navigator.clipboard&&navigator.clipboard.writeText&&(navigator.clipboard.writeText(n),u(!0),setTimeout(()=>u(!1),2e3))},style:l?{borderColor:`#10b981`,color:`#10b981`}:{},children:l?`Copied!`:`Copy Ray ID`})]})]})]})})}),(0,a.jsx)(`footer`,{className:`bp-footer-section`,children:(0,a.jsx)(`div`,{className:`bp-content-wrap`,children:(0,a.jsx)(`div`,{className:`bp-footer-meta`,children:(0,a.jsxs)(`div`,{children:[(0,a.jsxs)(`span`,{children:[`MDefender Ray ID: `,(0,a.jsx)(`strong`,{children:n})]}),(0,a.jsx)(`span`,{className:`bp-meta-dot`,children:`•`}),(0,a.jsxs)(`span`,{children:[`Your IP: `,(0,a.jsx)(`span`,{className:`bp-ip-mono`,children:o})]}),(0,a.jsx)(`span`,{className:`bp-meta-dot`,children:`•`}),(0,a.jsxs)(`span`,{children:[`Timestamp: `,(0,a.jsx)(`span`,{children:c})]}),(0,a.jsx)(`span`,{className:`bp-meta-dot`,children:`•`}),(0,a.jsxs)(`span`,{children:[`Performance & security by `,(0,a.jsx)(`strong`,{children:`MDefender Pro`})]})]})})})}),d&&(0,a.jsx)(`div`,{className:`bp-modal-overlay`,onClick:()=>f(!1),children:(0,a.jsxs)(`div`,{className:`bp-modal-card`,onClick:e=>e.stopPropagation(),children:[(0,a.jsx)(`h3`,{style:{fontSize:`18px`,fontWeight:600,color:`#0f172a`,marginBottom:`8px`},children:`Report False Positive / Request Access`}),(0,a.jsxs)(`p`,{style:{fontSize:`13px`,color:`#64748b`,marginBottom:`16px`},children:[`Your report will be sent to the security team of `,(0,a.jsx)(`strong`,{children:t}),` along with Ray ID `,(0,a.jsx)(`code`,{children:n}),`.`]}),_?(0,a.jsx)(`div`,{style:{padding:`16px`,background:`#ecfdf5`,color:`#065f46`,borderRadius:`6px`,fontSize:`13px`,fontWeight:500,textAlign:`center`},children:`Report sent successfully! The administrator will review your incident.`}):(0,a.jsxs)(`form`,{onSubmit:e=>{e.preventDefault(),v(!0),setTimeout(()=>{f(!1),v(!1),m(``),g(``)},1800)},children:[(0,a.jsxs)(`div`,{style:{marginBottom:`12px`},children:[(0,a.jsx)(`label`,{style:{display:`block`,fontSize:`12px`,fontWeight:600,color:`#334155`,marginBottom:`4px`},children:`Your Email Address`}),(0,a.jsx)(`input`,{type:`email`,required:!0,value:p,onChange:e=>m(e.target.value),placeholder:`user@example.com`,style:{width:`100%`,padding:`8px 12px`,borderRadius:`4px`,border:`1px solid #cbd5e1`,fontSize:`13px`}})]}),(0,a.jsxs)(`div`,{style:{marginBottom:`16px`},children:[(0,a.jsx)(`label`,{style:{display:`block`,fontSize:`12px`,fontWeight:600,color:`#334155`,marginBottom:`4px`},children:`What were you doing when blocked?`}),(0,a.jsx)(`textarea`,{rows:3,required:!0,value:h,onChange:e=>g(e.target.value),placeholder:`Describe your actions so the administrator can verify your request...`,style:{width:`100%`,padding:`8px 12px`,borderRadius:`4px`,border:`1px solid #cbd5e1`,fontSize:`13px`}})]}),(0,a.jsxs)(`div`,{style:{display:`flex`,justifyContent:`flex-end`,gap:`8px`},children:[(0,a.jsx)(`button`,{type:`button`,onClick:()=>f(!1),style:{padding:`7px 14px`,borderRadius:`4px`,border:`1px solid #cbd5e1`,background:`#ffffff`,color:`#475569`,fontSize:`13px`,cursor:`pointer`},children:`Cancel`}),(0,a.jsx)(`button`,{type:`submit`,style:{padding:`7px 16px`,borderRadius:`4px`,border:`none`,background:`#1e293b`,color:`#ffffff`,fontSize:`13px`,fontWeight:500,cursor:`pointer`},children:`Send Incident Report`})]})]})]})})]})}export{o as default};