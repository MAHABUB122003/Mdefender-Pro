import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import AgencySolution from './solutions/AgencySolution';
import EcommerceSolution from './solutions/EcommerceSolution';
import SaaSSolution from './solutions/SaaSSolution';
import WordPressSolution from './solutions/WordPressSolution';
import AISolution from './solutions/AISolution';
import FintechSolution from './solutions/FintechSolution';

export default function SolutionDetail() {
  const { slug } = useParams();
  const normalizedSlug = (slug || '').toLowerCase().replace(/-/g, '_');

  switch (normalizedSlug) {
    case 'agencies':
    case 'agency':
    case 'digital_agencies':
    case 'fleet':
      return <AgencySolution />;

    case 'ecommerce':
    case 'e_commerce':
    case 'retail':
    case 'woocommerce':
      return <EcommerceSolution />;

    case 'saas':
    case 'saas_apis':
    case 'apis':
    case 'cloud':
      return <SaaSSolution />;

    case 'wordpress':
    case 'wp':
    case 'wordpress_hardening':
      return <WordPressSolution />;

    case 'ai':
    case 'generative_ai':
    case 'llm':
    case 'genai':
      return <AISolution />;

    case 'fintech':
    case 'healthcare':
    case 'compliance':
    case 'banking':
      return <FintechSolution />;

    default:
      return <Navigate to="/solutions" replace />;
  }
}
