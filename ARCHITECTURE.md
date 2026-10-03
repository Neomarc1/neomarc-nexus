# NDOS Architecture

## Overview

The NEOMARC Digital Operating System (NDOS) is structured to run independently using modern full-stack web technologies.

```mermaid
flowchart TD
    User([End User]) --> CF(Cloudflare Workers)
    
    subgraph Frontend [Cloudflare Workers / SSR]
        CF --> Router(TanStack Start)
        Router --> React(React App)
    end
    
    subgraph Backend [Supabase]
        Router --> DB[(PostgreSQL)]
        Router --> Auth(Supabase Auth)
        Router --> Storage(Supabase Storage)
        DB --> Cron(pg_cron)
    end
    
    subgraph External [External Services]
        Router -.-> OpenAI(OpenAI API)
    end

    Cron -.-> |Scheduled HTTP Call| CF
```

## Core Components
- **Hosting & SSR**: Cloudflare Workers
- **Framework**: React via TanStack Start
- **Database & Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Background Jobs**: pg_cron in Supabase scheduling calls to the Automation Runner on Cloudflare.
- **AI Processing**: Server-side functions integrating directly with OpenAI API for receipt and expense analysis.
