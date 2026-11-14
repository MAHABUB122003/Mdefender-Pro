import{a as e,n as t,t as n}from"./jsx-runtime-KJkY8l8U.js";import{t as r}from"./arrow-left-anTmZ75Q.js";import{n as i,t as a}from"./earth-B5uXqzWf.js";import{t as o}from"./copy-B1Kia9BW.js";import{t as s}from"./mail-C8A5bROh.js";import{t as c}from"./shield-check-DzIuLOI1.js";import{A as l,b as u,c as d,p as f,s as p}from"./index-BaUTeG9B.js";var m=e(t(),1),h=n(),g=(typeof window<`u`&&[`localhost`,`127.0.0.1`,`[::1]`].includes(window.location.hostname)?`http://localhost:8000`:`https://mdefender-pro.crafix.tech`).replace(/\/+$/,``);function _(){let[e]=l(),t=e.get(`domain`)||(typeof window<`u`?window.location.hostname:``)||`this website`,n=e.get(`ray_id`)||e.get(`ref_id`)||`MDEF-PENDING`,_=e.get(`ip`)||``,v=e.get(`rule`)||`Managed WAF policy`,y=e.get(`timestamp`)||new Date().toISOString().replace(`T`,` `).slice(0,19)+` UTC`,[b,x]=(0,m.useState)(!1),[S,C]=(0,m.useState)(!1),[w,T]=(0,m.useState)(``),[E,D]=(0,m.useState)(``),[O,k]=(0,m.useState)(`idle`),[A,j]=(0,m.useState)(``),M=(0,m.useRef)(null),N=(0,m.useRef)(null);(0,m.useEffect)(()=>{if(!A)return;let e=setTimeout(()=>j(``),3200);return()=>clearTimeout(e)},[A]),(0,m.useEffect)(()=>{if(!S)return;let e=e=>{e.key===`Escape`&&C(!1)};document.addEventListener(`keydown`,e);let t=document.activeElement;return N.current?.focus(),()=>{document.removeEventListener(`keydown`,e),t&&t.focus&&t.focus()}},[S]);let P=async()=>{try{navigator.clipboard?.writeText&&await navigator.clipboard.writeText(n),x(!0),j(`Reference ID copied`),setTimeout(()=>x(!1),2e3)}catch{j(`Copy failed — select the reference ID manually`)}},F=async e=>{e.preventDefault(),k(`sending`);try{if(!(await fetch(`${g}/api/v1/waf/report-false-positive`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({reference_id:n,client_ip:_,url:typeof window<`u`?window.location.href:``,attack_type:v,reason:`Visitor reports a legitimate request was blocked`,user_email:w,comments:E})})).ok)throw Error(`Report failed`);k(`sent`)}catch{k(`error`)}},I=(0,m.useMemo)(()=>[{icon:f,label:`Reference ID`,value:n,mono:!0,copy:!0},{icon:a,label:`Website`,value:t},{icon:i,label:`Timestamp`,value:y},..._?[{icon:c,label:`Your IP address`,value:_,mono:!0}]:[]],[t,_,n,y]);return(0,h.jsxs)(`div`,{className:`bp`,children:[(0,h.jsx)(`style`,{children:`
        .bp {
          min-height: 100vh;
          background: var(--md-paper, #f6f5f0);
          color: var(--md-ink, #10201e);
          font-family: var(--md-font-sans, 'Inter', sans-serif);
          display: flex;
          flex-direction: column;
        }
        .bp * { box-sizing: border-box; }
        .bp a { color: inherit; }
        .bp-top {
          display: flex; align-items: center; justify-content: space-between; gap: 16px;
          padding: 20px 32px; border-bottom: 1px solid var(--md-line, #e2e5de);
          background: rgba(255,255,255,.55);
        }
        .bp-brand { display: flex; align-items: center; gap: 10px; text-decoration: none; }
        .bp-brand img { width: 30px; height: 30px; object-fit: contain; }
        .bp-brand span { font-weight: 700; font-size: 14px; letter-spacing: -.01em; }
        .bp-brand em { font-style: normal; color: var(--md-amber, #e8792f); }
        .bp-status {
          display: inline-flex; align-items: center; gap: 7px;
          font-size: 11px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase;
          color: var(--md-danger, #c0392b); background: var(--md-danger-soft, #f8e5e1);
          border: 1px solid rgba(192,57,43,.18); border-radius: 999px; padding: 6px 11px;
        }
        .bp-main {
          width: 100%; max-width: 1120px; margin: 0 auto; padding: 56px 32px 40px;
          display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, .85fr); gap: 48px;
          align-items: start; align-content: center; flex: 1;
        }
        .bp-eyebrow {
          font-size: 11px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase;
          color: var(--md-amber, #e8792f); margin: 0 0 14px;
        }
        .bp h1 {
          font-family: var(--md-font-display, 'Plus Jakarta Sans', sans-serif);
          font-size: clamp(30px, 4vw, 44px); line-height: 1.06; letter-spacing: -.035em;
          font-weight: 700; margin: 0 0 16px;
        }
        .bp-lead { font-size: 14.5px; line-height: 1.65; color: var(--md-ink-2, #465955); margin: 0 0 24px; max-width: 52ch; }
        .bp-rule {
          display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap;
          background: var(--md-surface, #fff); border: 1px solid var(--md-line, #e2e5de);
          border-radius: 10px; padding: 9px 12px; font-size: 12px; color: var(--md-ink-2, #465955);
          margin-bottom: 28px;
        }
        .bp-rule code {
          font-family: var(--md-font-mono, monospace); font-size: 11.5px; color: var(--md-ink, #10201e);
          background: var(--md-surface-sunken, #efeee8); border-radius: 5px; padding: 3px 6px;
        }
        .bp-actions { display: flex; flex-wrap: wrap; gap: 10px; }
        .bp-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          height: 40px; padding: 0 16px; border-radius: 8px; font-size: 13px; font-weight: 600;
          cursor: pointer; text-decoration: none; border: 1px solid transparent;
          transition: background 140ms ease, border-color 140ms ease, color 140ms ease;
        }
        .bp-btn-primary { background: var(--md-forest, #0b2b26); color: #fff; }
        .bp-btn-primary:hover { background: var(--md-forest-2, #123f37); }
        .bp-btn-secondary { background: var(--md-surface, #fff); border-color: var(--md-line-strong, #cfd5cb); color: var(--md-ink, #10201e); }
        .bp-btn-secondary:hover { background: var(--md-surface-hover, #faf9f5); }
        .bp-btn-ghost { background: transparent; color: var(--md-ink-2, #465955); }
        .bp-btn-ghost:hover { background: rgba(16,32,30,.05); }
        .bp-card {
          background: var(--md-surface, #fff); border: 1px solid var(--md-line, #e2e5de);
          border-radius: 14px; box-shadow: 0 1px 2px rgba(16,32,30,.04); overflow: hidden;
        }
        .bp-card-head { padding: 18px 20px 14px; border-bottom: 1px solid var(--md-line, #e2e5de); }
        .bp-card-head h2 { font-size: 13.5px; font-weight: 650; margin: 0 0 3px; }
        .bp-card-head p { font-size: 11.5px; color: var(--md-ink-3, #6e7f7a); margin: 0; }
        .bp-dl { margin: 0; padding: 6px 20px 14px; }
        .bp-row {
          display: flex; align-items: flex-start; gap: 10px; padding: 11px 0;
          border-bottom: 1px solid var(--md-line, #e2e5de);
        }
        .bp-row:last-child { border-bottom: 0; }
        .bp-row svg { color: var(--md-ink-3, #6e7f7a); margin-top: 2px; flex-shrink: 0; }
        .bp-row dt { font-size: 11px; color: var(--md-ink-3, #6e7f7a); margin-bottom: 2px; }
        .bp-row dd { margin: 0; font-size: 12.5px; font-weight: 500; overflow-wrap: anywhere; }
        .bp-row dd.mono { font-family: var(--md-font-mono, monospace); font-size: 12px; }
        .bp-copy {
          margin-left: auto; background: none; border: 0; padding: 4px; border-radius: 6px;
          color: var(--md-ink-3, #6e7f7a); cursor: pointer; display: inline-flex;
        }
        .bp-copy:hover { background: var(--md-surface-sunken, #efeee8); color: var(--md-ink, #10201e); }
        .bp-help { margin-top: 20px; display: grid; gap: 12px; }
        .bp-help-item { display: flex; gap: 10px; font-size: 12px; line-height: 1.55; color: var(--md-ink-2, #465955); }
        .bp-help-item strong { color: var(--md-ink, #10201e); font-weight: 600; }
        .bp-section { border-top: 1px solid var(--md-line, #e2e5de); background: rgba(255,255,255,.45); }
        .bp-section-inner {
          max-width: 1120px; margin: 0 auto; padding: 36px 32px 44px;
          display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 28px;
        }
        .bp-section h3 { font-size: 13px; font-weight: 650; margin: 0 0 8px; display: flex; align-items: center; gap: 8px; }
        .bp-section p { font-size: 12.5px; line-height: 1.6; color: var(--md-ink-2, #465955); margin: 0; }
        .bp-foot {
          border-top: 1px solid var(--md-line, #e2e5de); padding: 16px 32px;
          display: flex; flex-wrap: wrap; gap: 8px 18px; align-items: center; justify-content: space-between;
          font-size: 11.5px; color: var(--md-ink-3, #6e7f7a);
        }
        .bp-foot strong { color: var(--md-ink-2, #465955); font-weight: 600; }
        .bp-toast {
          position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%);
          background: var(--md-forest, #0b2b26); color: #fff; font-size: 12.5px; font-weight: 500;
          padding: 10px 16px; border-radius: 999px; box-shadow: 0 12px 32px rgba(16,32,30,.2); z-index: 60;
        }
        .bp-overlay {
          position: fixed; inset: 0; background: rgba(10,25,22,.55); backdrop-filter: blur(3px);
          display: flex; align-items: center; justify-content: center; padding: 20px; z-index: 50;
        }
        .bp-dialog {
          width: 100%; max-width: 520px; background: var(--md-surface, #fff); border-radius: 16px;
          box-shadow: 0 24px 64px rgba(16,32,30,.28); overflow: hidden;
        }
        .bp-dialog-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 20px 22px 0; }
        .bp-dialog-head h2 { font-size: 16px; margin: 0 0 4px; }
        .bp-dialog-head p { font-size: 12px; color: var(--md-ink-3, #6e7f7a); margin: 0; }
        .bp-dialog-body { padding: 18px 22px 22px; display: grid; gap: 14px; }
        .bp-field { display: grid; gap: 6px; }
        .bp-field label { font-size: 11.5px; font-weight: 600; color: var(--md-ink-2, #465955); }
        .bp-field input, .bp-field textarea {
          width: 100%; border: 1px solid var(--md-line-strong, #cfd5cb); border-radius: 8px;
          padding: 9px 11px; font-family: inherit; font-size: 13px; color: var(--md-ink, #10201e);
          background: var(--md-surface, #fff); outline: none;
        }
        .bp-field input:focus, .bp-field textarea:focus { border-color: var(--md-amber, #e8792f); box-shadow: 0 0 0 3px rgba(232,121,47,.15); }
        .bp-field textarea { min-height: 84px; resize: vertical; }
        .bp-note { font-size: 11px; color: var(--md-ink-3, #6e7f7a); line-height: 1.5; }
        .bp-close { background: none; border: 0; cursor: pointer; color: var(--md-ink-3, #6e7f7a); padding: 4px; border-radius: 6px; }
        .bp-close:hover { background: var(--md-surface-sunken, #efeee8); }
        @media (max-width: 900px) {
          .bp-main { grid-template-columns: 1fr; gap: 32px; padding: 36px 20px 28px; }
          .bp-section-inner { grid-template-columns: 1fr; gap: 20px; padding: 28px 20px 32px; }
          .bp-top { padding: 16px 20px; }
          .bp-foot { padding: 14px 20px; }
        }
      `}),(0,h.jsxs)(`header`,{className:`bp-top`,children:[(0,h.jsxs)(`a`,{className:`bp-brand`,href:`/`,"aria-label":`MDefender Pro home`,children:[(0,h.jsx)(`img`,{src:`/assets/mdefender_logo.png`,alt:``}),(0,h.jsxs)(`span`,{children:[`MDefender `,(0,h.jsx)(`em`,{children:`Pro`})]})]}),(0,h.jsxs)(`span`,{className:`bp-status`,children:[(0,h.jsx)(d,{size:12,strokeWidth:2.2}),` Request blocked`]})]}),(0,h.jsxs)(`main`,{className:`bp-main`,children:[(0,h.jsxs)(`section`,{"aria-labelledby":`bp-title`,children:[(0,h.jsx)(`p`,{className:`bp-eyebrow`,children:`Access restricted · HTTP 403`}),(0,h.jsx)(`h1`,{id:`bp-title`,children:`This request was blocked to keep the site safe.`}),(0,h.jsx)(`p`,{className:`bp-lead`,children:`Our security layer flagged this request as potentially malicious before it reached the website. If you are the site owner or a legitimate visitor, use the reference below to look it up or ask for a review.`}),(0,h.jsxs)(`div`,{className:`bp-rule`,children:[(0,h.jsx)(c,{size:14}),` Matched policy `,(0,h.jsx)(`code`,{children:v})]}),(0,h.jsxs)(`div`,{className:`bp-actions`,children:[(0,h.jsxs)(`button`,{type:`button`,className:`bp-btn bp-btn-primary`,onClick:()=>C(!0),children:[(0,h.jsx)(s,{size:15}),` Request a review`]}),(0,h.jsxs)(`button`,{type:`button`,className:`bp-btn bp-btn-secondary`,onClick:P,children:[b?(0,h.jsx)(u,{size:15}):(0,h.jsx)(o,{size:15}),` `,b?`Copied`:`Copy reference ID`]}),(0,h.jsxs)(`button`,{type:`button`,className:`bp-btn bp-btn-ghost`,onClick:()=>window.history.length>1?window.history.back():window.location.href=`/`,children:[(0,h.jsx)(r,{size:15}),` Go back`]})]})]}),(0,h.jsxs)(`aside`,{"aria-label":`Request details`,children:[(0,h.jsxs)(`div`,{className:`bp-card`,children:[(0,h.jsxs)(`div`,{className:`bp-card-head`,children:[(0,h.jsx)(`h2`,{children:`Request details`}),(0,h.jsx)(`p`,{children:`Share these details with the site owner if you need help.`})]}),(0,h.jsx)(`dl`,{className:`bp-dl`,children:I.map(({icon:e,label:t,value:n,mono:r,copy:i})=>(0,h.jsxs)(`div`,{className:`bp-row`,children:[(0,h.jsx)(e,{size:14}),(0,h.jsxs)(`div`,{style:{minWidth:0},children:[(0,h.jsx)(`dt`,{children:t}),(0,h.jsx)(`dd`,{className:r?`mono`:``,children:n})]}),i&&(0,h.jsx)(`button`,{type:`button`,className:`bp-copy`,onClick:P,"aria-label":`Copy reference ID`,children:b?(0,h.jsx)(u,{size:14}):(0,h.jsx)(o,{size:14})})]},t))})]}),(0,h.jsxs)(`div`,{className:`bp-help`,children:[(0,h.jsxs)(`div`,{className:`bp-help-item`,children:[(0,h.jsx)(c,{size:15,style:{flexShrink:0,marginTop:1}}),(0,h.jsxs)(`span`,{children:[(0,h.jsx)(`strong`,{children:`Nothing was installed or changed.`}),` The request was stopped at the edge.`]})]}),(0,h.jsxs)(`div`,{className:`bp-help-item`,children:[(0,h.jsx)(i,{size:15,style:{flexShrink:0,marginTop:1}}),(0,h.jsxs)(`span`,{children:[(0,h.jsx)(`strong`,{children:`Legitimate action?`}),` Submit a review and the site owner can whitelist the rule.`]})]})]})]})]}),(0,h.jsx)(`section`,{className:`bp-section`,"aria-label":`Why this happened`,children:(0,h.jsxs)(`div`,{className:`bp-section-inner`,children:[(0,h.jsxs)(`div`,{children:[(0,h.jsxs)(`h3`,{children:[(0,h.jsx)(c,{size:15}),` Automated protection`]}),(0,h.jsx)(`p`,{children:`Every request passes through signature, behavioural and machine-learning checks before it reaches the origin server.`})]}),(0,h.jsxs)(`div`,{children:[(0,h.jsxs)(`h3`,{children:[(0,h.jsx)(d,{size:15}),` Why this one`]}),(0,h.jsx)(`p`,{children:`The request matched a rule designed to stop injection, scripted abuse or known exploit patterns. False positives are rare but possible.`})]}),(0,h.jsxs)(`div`,{children:[(0,h.jsxs)(`h3`,{children:[(0,h.jsx)(s,{size:15}),` What happens next`]}),(0,h.jsx)(`p`,{children:`Your review request is logged with the reference ID. The site owner can inspect the request and adjust the policy.`})]})]})}),(0,h.jsxs)(`footer`,{className:`bp-foot`,children:[(0,h.jsxs)(`span`,{children:[`Protected by `,(0,h.jsx)(`strong`,{children:`MDefender Pro`}),` · Reference `,(0,h.jsx)(`strong`,{children:n})]}),(0,h.jsx)(`span`,{children:y})]}),A&&(0,h.jsx)(`div`,{className:`bp-toast`,role:`status`,children:A}),S&&(0,h.jsx)(`div`,{className:`bp-overlay`,role:`presentation`,onMouseDown:e=>{e.target===e.currentTarget&&C(!1)},children:(0,h.jsxs)(`div`,{className:`bp-dialog`,role:`dialog`,"aria-modal":`true`,"aria-labelledby":`bp-report-title`,ref:M,children:[(0,h.jsxs)(`div`,{className:`bp-dialog-head`,children:[(0,h.jsxs)(`div`,{children:[(0,h.jsx)(`h2`,{id:`bp-report-title`,children:`Request a review`}),(0,h.jsx)(`p`,{children:`Tell the site owner what you were doing when this page appeared.`})]}),(0,h.jsx)(`button`,{type:`button`,className:`bp-close`,onClick:()=>C(!1),"aria-label":`Close dialog`,ref:N,children:(0,h.jsx)(p,{size:18})})]}),O===`sent`?(0,h.jsxs)(`div`,{className:`bp-dialog-body`,children:[(0,h.jsx)(`h3`,{style:{margin:0,fontSize:14},children:`Review requested`}),(0,h.jsxs)(`p`,{style:{margin:0,fontSize:12.5,color:`var(--md-ink-2, #465955)`,lineHeight:1.6},children:[`Your report has been recorded against reference `,(0,h.jsx)(`strong`,{children:n}),`. The site owner can now inspect the blocked request and adjust the policy if it was legitimate.`]}),(0,h.jsx)(`button`,{type:`button`,className:`bp-btn bp-btn-primary`,onClick:()=>C(!1),children:`Close`})]}):(0,h.jsxs)(`form`,{className:`bp-dialog-body`,onSubmit:F,children:[(0,h.jsxs)(`div`,{className:`bp-field`,children:[(0,h.jsx)(`label`,{htmlFor:`bp-email`,children:`Your email (optional)`}),(0,h.jsx)(`input`,{id:`bp-email`,type:`email`,autoComplete:`email`,placeholder:`you@example.com`,value:w,onChange:e=>T(e.target.value)})]}),(0,h.jsxs)(`div`,{className:`bp-field`,children:[(0,h.jsx)(`label`,{htmlFor:`bp-note`,children:`What were you trying to do?`}),(0,h.jsx)(`textarea`,{id:`bp-note`,placeholder:`e.g. submitting a support form with a link in the message`,value:E,onChange:e=>D(e.target.value),required:!0})]}),(0,h.jsx)(`p`,{className:`bp-note`,children:`We send the reference ID, the page URL and your note. We never ask for passwords or payment details.`}),O===`error`&&(0,h.jsx)(`p`,{className:`bp-note`,style:{color:`var(--md-danger, #c0392b)`},children:`We could not submit the report. Please try again, or copy the reference ID and contact the site owner.`}),(0,h.jsxs)(`div`,{style:{display:`flex`,gap:10,justifyContent:`flex-end`},children:[(0,h.jsx)(`button`,{type:`button`,className:`bp-btn bp-btn-secondary`,onClick:()=>C(!1),children:`Cancel`}),(0,h.jsx)(`button`,{type:`submit`,className:`bp-btn bp-btn-primary`,disabled:O===`sending`,children:O===`sending`?`Sending…`:`Submit request`})]})]})]})})]})}export{_ as default};