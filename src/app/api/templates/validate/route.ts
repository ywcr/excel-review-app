import { NextRequest, NextResponse } from 'next/server';
import { templateManager } from '@/lib/templateManager';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskName = searchParams.get('taskName');

    if (!taskName) {
      return NextResponse.json(
        { error: 'taskName parameter is required' },
        { status: 400 }
      );
    }

    // 验证模板
    const validation = await templateManager.validateTemplate(taskName);
    
    // 获取缓存状态
    const cacheStatus = templateManager.getCacheStatus();
    const templateCache = cacheStatus.find(item => item.taskName === taskName);

    return NextResponse.json({
      taskName,
      validation,
      cache: templateCache || null,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Template validation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, taskNames, config } = body;

    switch (action) {
      case 'preload':
        if (!taskNames || !Array.isArray(taskNames)) {
          return NextResponse.json(
            { error: 'taskNames array is required for preload action' },
            { status: 400 }
          );
        }

        await templateManager.preloadTemplates(taskNames);
        const cacheStatus = templateManager.getCacheStatus();

        return NextResponse.json({
          action: 'preload',
          taskNames,
          cacheStatus,
          timestamp: new Date().toISOString()
        });

      case 'clearCache':
        const taskName = body.taskName;
        templateManager.clearCache(taskName);

        return NextResponse.json({
          action: 'clearCache',
          taskName: taskName || 'all',
          timestamp: new Date().toISOString()
        });

      case 'updateConfig':
        if (!config) {
          return NextResponse.json(
            { error: 'config object is required for updateConfig action' },
            { status: 400 }
          );
        }

        templateManager.updateConfig(config);
        const newConfig = templateManager.getConfig();

        return NextResponse.json({
          action: 'updateConfig',
          config: newConfig,
          timestamp: new Date().toISOString()
        });

      case 'validateAll':
        if (!taskNames || !Array.isArray(taskNames)) {
          return NextResponse.json(
            { error: 'taskNames array is required for validateAll action' },
            { status: 400 }
          );
        }

        const validations = await Promise.all(
          taskNames.map(async (name) => ({
            taskName: name,
            validation: await templateManager.validateTemplate(name)
          }))
        );

        return NextResponse.json({
          action: 'validateAll',
          validations,
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Template management error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
