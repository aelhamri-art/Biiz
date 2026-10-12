<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Every data table carries workspace_id and RLS via is_member(); cross-project leaks are the main risk.
- Membership changes go through SECURITY DEFINER RPCs (invite_member, claim_invites, remove_member); workspace_members has no direct write policies.
- Public tracking writes (/r/$code, /api/public/track) use the service role and derive workspace from the link code, never from client input.
- Attribution is client-side in /api/public/biiz.js via the `bz` param: first touch and last touch kept in localStorage.
- The kitchen page (/hadal-marketing) is a public URL but shows data only to signed-in workspace members (RLS); missions and inspirations are authored in the cockpit's Page cuisine tab, and uploaded rushes become `contents` rows (type rush, mission_id) in the `rushs` bucket.
- Instagram inspirations accept only HTTPS Instagram post/Reel permalinks and render official Instagram embeds with an external fallback, keeping untrusted URLs out of iframe sources.

- Presentation refinements share semantic tokens and reusable UI components in the global stylesheet; module queries and mutations stay unchanged so visual redesigns cannot alter business behavior.
- HADAL-specific editorial layouts use scoped `hadal-*` presentation classes and bundled illustrative media; shared cockpit styling remains unchanged to isolate kitchen refinements.
