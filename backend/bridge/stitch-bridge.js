import { Stitch, StitchToolClient } from '@google/stitch-sdk';

async function main() {
  let inputData = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) {
    inputData += chunk;
  }

  let input;
  try {
    input = JSON.parse(inputData);
  } catch (e) {
    writeError('VALIDATION_ERROR', 'Invalid JSON input', false);
    process.exit(1);
  }

  const {
    action,
    access_token,
    project_id,        // Google Cloud project ID (for OAuth)
    stitch_project_id, // Stitch project ID (for generate/edit/variants)
    screen_id,
    prompt,
    device_type,
    variant_options,
    title,
  } = input;

  // StitchToolClient connects via OAuth access token + GCP project ID
  const toolClient = new StitchToolClient({ accessToken: access_token, projectId: project_id });
  const stitch = new Stitch(toolClient);

  try {
    if (action === 'validate') {
      const projects = await stitch.projects();
      const projectList = projects.map(p => ({ id: p.id, title: p.title || 'Untitled' }));
      await toolClient.close();
      writeSuccess([], null, projectList);

    } else if (action === 'create_project') {
      const project = await stitch.createProject(title || 'My Designs');
      await toolClient.close();
      writeSuccess([], { id: project.id, title: project.title || title || 'My Designs' });

    } else if (action === 'generate') {
      const project = stitch_project_id
        ? stitch.project(stitch_project_id)
        : (await stitch.projects())[0];

      const screen = await project.generate(prompt, device_type || 'DESKTOP');
      const [htmlUrl, imageUrl] = await Promise.all([screen.getHtml(), screen.getImage()]);

      await toolClient.close();
      writeSuccess([{
        screen_id: screen.id,
        project_id: project.id,
        html_url: htmlUrl,
        image_url: imageUrl,
        device_type: device_type || 'DESKTOP',
      }]);

    } else if (action === 'edit') {
      const project = stitch_project_id
        ? stitch.project(stitch_project_id)
        : (await stitch.projects())[0];

      const screen = project.screen(screen_id);
      const editedScreen = await screen.edit(prompt);
      const [htmlUrl, imageUrl] = await Promise.all([editedScreen.getHtml(), editedScreen.getImage()]);

      await toolClient.close();
      writeSuccess([{
        screen_id: editedScreen.id,
        project_id: project.id,
        html_url: htmlUrl,
        image_url: imageUrl,
        device_type: device_type || 'DESKTOP',
      }]);

    } else if (action === 'variants') {
      const project = stitch_project_id
        ? stitch.project(stitch_project_id)
        : (await stitch.projects())[0];

      const screen = project.screen(screen_id);
      const variantOpts = variant_options || { variantCount: 3 };
      const variants = await screen.variants(prompt, variantOpts);

      const screenResults = await Promise.all(
        variants.map(async (v) => {
          const [htmlUrl, imageUrl] = await Promise.all([v.getHtml(), v.getImage()]);
          return {
            screen_id: v.id,
            project_id: project.id,
            html_url: htmlUrl,
            image_url: imageUrl,
            device_type: device_type || 'DESKTOP',
          };
        })
      );

      await toolClient.close();
      writeSuccess(screenResults);

    } else {
      await toolClient.close();
      writeError('VALIDATION_ERROR', `Unknown action: ${action}`, false);
    }

  } catch (err) {
    try { await toolClient.close(); } catch {}
    const errStr = err.message || String(err);
    let code = err.code || 'UNKNOWN_ERROR';

    if (code === 'UNKNOWN_ERROR') {
      if (errStr.includes('AUTH_FAILED') || errStr.includes('401') || errStr.includes('unauthenticated') || errStr.includes('Unauthorized') || errStr.includes('API keys are not supported')) code = 'AUTH_FAILED';
      else if (errStr.includes('RATE_LIMITED') || errStr.includes('429') || errStr.includes('rate limit')) code = 'RATE_LIMITED';
      else if (errStr.includes('NOT_FOUND') || errStr.includes('404') || errStr.includes('not found')) code = 'NOT_FOUND';
      else if (errStr.includes('ENOTFOUND') || errStr.includes('ECONNREFUSED') || errStr.includes('network')) code = 'NETWORK_ERROR';
    }

    writeError(code, errStr, code !== 'AUTH_FAILED');
  }
}

function writeSuccess(screens, project = null, projects = null) {
  const output = { success: true, screens, error: null };
  if (project) output.project = project;
  if (projects) output.projects = projects;
  process.stdout.write(JSON.stringify(output) + '\n');
}

function writeError(code, message, recoverable) {
  process.stdout.write(JSON.stringify({ success: false, screens: [], error: { code, message, recoverable } }) + '\n');
}

main().catch(err => {
  writeError('UNKNOWN_ERROR', err.message || String(err), true);
  process.exit(1);
});
