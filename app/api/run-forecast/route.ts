import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST() {
  try {
    // Python 스크립트를 Node.js에서 실행
    const { stdout, stderr } = await execAsync('python3 backend/main.py');
    
    if (stderr) {
      return NextResponse.json({ status: 'error', message: stderr }, { status: 500 });
    }
    
    return NextResponse.json({ status: 'success', message: '예측 완료', output: stdout });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}